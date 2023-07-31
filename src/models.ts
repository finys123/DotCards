export interface Column {
    name: string;
    type: string;
    isPrimaryKey?: boolean;
    unique?: boolean;
    autoIncrement?: boolean;
    default?: string;
}

export interface Table {
    name: string;
    columns: Column[];
    foreignKeys?: ForeignKey[];
}

export interface ForeignKey {
    column: string;
    references: string;
    onDelete?: string;
    onUpdate?: string;
}

export interface Schema {
    tables: Table[];
}