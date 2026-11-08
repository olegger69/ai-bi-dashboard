import { DataRow, DatasetProfile } from './types';
import { createColumnMeta } from './typeDetector';

export function profileDataset(data: DataRow[]): DatasetProfile {
    if (data.length === 0) {
        return { totalRows: 0, totalColumns: 0, columns: [] };
    }

    const columnNames = Object.keys(data[0]);
    const columns = columnNames.map(name => createColumnMeta(data, name));

    return {
        totalRows: data.length,
        totalColumns: columns.length,
        columns,
    };
}