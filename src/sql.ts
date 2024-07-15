import mysql from 'mysql2/promise';
import { Client } from 'pg';

export async function getMySQLDump(databaseUrl: string): Promise<string> {
    const connection = await mysql.createConnection(databaseUrl);
    const [tables] = await connection.execute('SHOW TABLES');
    // @ts-ignore
    const tableNames = tables.map((row: any) => Object.values(row)[0]);

    let dump = '';
    for (const tableName of tableNames) {
        const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
        dump += `${createTable[0]['Create Table']};\n\n`;
    }

    await connection.end();
    return dump;
}

export async function getPostgresDump(databaseUrl: string): Promise<string> {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    const res = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
    `);

    const tableNames = res.rows.map(row => row.table_name);
    let dump = '';

    for (const tableName of tableNames) {
        const tableRes = await client.query(`SELECT pg_get_tabledef('${tableName}')`);
        dump += `${tableRes.rows[0].pg_get_tabledef};\n\n`;
    }

    await client.end();
    return dump;
}
