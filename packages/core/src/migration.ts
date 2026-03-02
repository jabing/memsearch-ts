/**
 * Migration utilities for upgrading Milvus collections to triple memory schema
 */

import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { createLogger } from './utils/logger.js';

const logger = createLogger('migration');

export interface MigrationOptions {
  batchSize?: number;
  onProgress?: (current: number, total: number) => void;
}

export interface MigrationResult {
  migrated: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Migrate existing Collection to new Schema with triple memory fields
 */
export async function migrateCollection(
  oldCollectionName: string,
  newCollectionName: string,
  milvusUri: string,
  options?: MigrationOptions
): Promise<MigrationResult> {
  const { batchSize = 100, onProgress } = options || {};

  const client = new MilvusClient({ address: milvusUri });
  const result: MigrationResult = { migrated: 0, failed: 0, errors: [] };

  try {
    logger.info('Starting migration', { oldCollectionName, newCollectionName });

    // Query all data from old collection
    const oldData = await client.query({
      collection_name: oldCollectionName,
      output_fields: ['*'],
      limit: 100000,
    } as any);

    const records = oldData.data || [];
    const total = records.length;

    if (total === 0) {
      logger.info('No data to migrate');
      return result;
    }

    logger.info('Found records to migrate', { total });

    // Transform records to new schema
    const transformedRecords = records.map((record: any) => ({
      // Existing fields (copy as-is)
      chunk_hash: record.chunk_hash,
      embedding: record.embedding,
      content: record.content,
      source: record.source,
      heading: record.heading,
      heading_level: record.heading_level,
      start_line: record.start_line,
      end_line: record.end_line,
      sparse_vector: record.sparse_vector,

      // New triple memory fields with defaults
      memory_type: record.memory_type || 'chunk',
      node_type: record.node_type || null,
      label: record.label || null,
      importance: record.importance ?? null,
      memory_data: record.memory_data || null,
      relations: record.relations || null,
      created_at: record.created_at || Date.now(),
      updated_at: record.updated_at || Date.now(),
      access_count: record.access_count ?? 0,
    }));

    // Batch insert into new collection
    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);

      try {
        await client.insert({
          collection_name: newCollectionName,
          data: batch,
        } as any);

        result.migrated += batch.length;

        if (onProgress) {
          onProgress(result.migrated, total);
        }

        logger.debug('Batch migrated', { batch: result.migrated, total });
      } catch (error) {
        result.failed += batch.length;
        result.errors.push({
          id: `batch-${i}`,
          error: (error as Error).message,
        });
        logger.error('Batch migration failed', { batch: i, error });
      }
    }

    logger.info('Migration completed', {
      migrated: result.migrated,
      failed: result.failed,
      total,
    });
  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  }

  return result;
}

/**
 * Verify migration completed successfully
 */
export async function verifyMigration(
  oldCollectionName: string,
  newCollectionName: string,
  milvusUri: string
): Promise<{ oldCount: number; newCount: number; valid: boolean }> {
  const client = new MilvusClient({ address: milvusUri });

  const oldData = await client.query({
    collection_name: oldCollectionName,
    output_fields: ['count(*)'],
  } as any);

  const newData = await client.query({
    collection_name: newCollectionName,
    output_fields: ['count(*)'],
  } as any);

  const oldCount = Number(oldData.data?.[0]?.['count(*)'] ?? 0);
  const newCount = Number(newData.data?.[0]?.['count(*)'] ?? 0);

  return {
    oldCount,
    newCount,
    valid: oldCount === newCount,
  };
}
