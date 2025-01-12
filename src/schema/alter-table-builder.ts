import { AddColumnNode } from '../operation-node/add-column-node.js'
import { AlterColumnNode } from '../operation-node/alter-column-node.js'
import { AlterTableNode } from '../operation-node/alter-table-node.js'
import { ColumnDefinitionNode } from '../operation-node/column-definition-node.js'
import {
  ColumnDataType,
  DataTypeNode,
} from '../operation-node/data-type-node.js'
import { DropColumnNode } from '../operation-node/drop-column-node.js'
import { IdentifierNode } from '../operation-node/identifier-node.js'
import {
  isOperationNodeSource,
  OperationNodeSource,
} from '../operation-node/operation-node-source.js'
import { OnDelete } from '../operation-node/references-node.js'
import { RenameColumnNode } from '../operation-node/rename-column-node.js'
import { TableNode } from '../operation-node/table-node.js'
import { ValueNode } from '../operation-node/value-node.js'
import { CompiledQuery } from '../query-compiler/compiled-query.js'
import { RawBuilder } from '../raw-builder/raw-builder.js'
import { Compilable } from '../util/compilable.js'
import { PrimitiveValue } from '../util/object-utils.js'
import { preventAwait } from '../util/prevent-await.js'
import { QueryExecutor } from '../query-executor/query-executor.js'
import {
  ColumnDefinitionBuilder,
  ColumnDefinitionBuilderInterface,
} from './column-definition-builder.js'
import { AnyRawBuilder } from '../query-builder/type-utils.js'
import { QueryId } from '../util/query-id.js'

export class AlterTableBuilder {
  readonly #queryId: QueryId
  readonly #alterTableNode: AlterTableNode
  readonly #executor: QueryExecutor

  constructor(args: AlterTableBuilderConstructorArgs) {
    this.#queryId = args.queryId
    this.#alterTableNode = args.alterTableNode
    this.#executor = args.executor
  }

  renameTo(newTableName: string): AlterTableExecutor {
    return new AlterTableExecutor({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: AlterTableNode.cloneWith(this.#alterTableNode, {
        renameTo: TableNode.create(newTableName),
      }),
    })
  }

  setSchema(newSchema: string): AlterTableExecutor {
    return new AlterTableExecutor({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: AlterTableNode.cloneWith(this.#alterTableNode, {
        setSchema: IdentifierNode.create(newSchema),
      }),
    })
  }

  alterColumn(column: string): AlterColumnBuilder {
    return new AlterColumnBuilder({
      queryId: this.#queryId,
      alterTableNode: this.#alterTableNode,
      alterColumnNode: AlterColumnNode.create(column),
      executor: this.#executor,
    })
  }

  dropColumn(column: string): AlterTableExecutor {
    return new AlterTableExecutor({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: AlterTableNode.cloneWith(this.#alterTableNode, {
        dropColumn: DropColumnNode.create(column),
      }),
    })
  }

  renameColumn(column: string, newColumn: string): AlterTableExecutor {
    return new AlterTableExecutor({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: AlterTableNode.cloneWith(this.#alterTableNode, {
        renameColumn: RenameColumnNode.create(column, newColumn),
      }),
    })
  }

  addColumn(
    columnName: string,
    dataType: ColumnDataType | RawBuilder
  ): AlterTableAddColumnBuilder {
    return new AlterTableAddColumnBuilder({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: this.#alterTableNode,
      columnBuilder: new ColumnDefinitionBuilder(
        ColumnDefinitionNode.create(
          columnName,
          isOperationNodeSource(dataType)
            ? dataType.toOperationNode()
            : DataTypeNode.create(dataType)
        )
      ),
    })
  }
}

export class AlterColumnBuilder {
  readonly #queryId: QueryId
  readonly #alterTableNode: AlterTableNode
  readonly #alterColumnNode: AlterColumnNode
  readonly #executor: QueryExecutor

  constructor(args: AlterColumnBuilderConstructorArgs) {
    this.#queryId = args.queryId
    this.#alterTableNode = args.alterTableNode
    this.#alterColumnNode = args.alterColumnNode
    this.#executor = args.executor
  }

  setDataType(dataType: ColumnDataType): AlterTableExecutor {
    return new AlterTableExecutor({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: AlterTableNode.cloneWith(this.#alterTableNode, {
        alterColumn: AlterColumnNode.cloneWith(this.#alterColumnNode, {
          dataType: DataTypeNode.create(dataType),
        }),
      }),
    })
  }

  setDefault(value: PrimitiveValue | AnyRawBuilder): AlterTableExecutor {
    return new AlterTableExecutor({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: AlterTableNode.cloneWith(this.#alterTableNode, {
        alterColumn: AlterColumnNode.cloneWith(this.#alterColumnNode, {
          setDefault: isOperationNodeSource(value)
            ? value.toOperationNode()
            : ValueNode.createImmediate(value),
        }),
      }),
    })
  }

  dropDefault(): AlterTableExecutor {
    return new AlterTableExecutor({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: AlterTableNode.cloneWith(this.#alterTableNode, {
        alterColumn: AlterColumnNode.cloneWith(this.#alterColumnNode, {
          dropDefault: true,
        }),
      }),
    })
  }

  setNotNull(): AlterTableExecutor {
    return new AlterTableExecutor({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: AlterTableNode.cloneWith(this.#alterTableNode, {
        alterColumn: AlterColumnNode.cloneWith(this.#alterColumnNode, {
          setNotNull: true,
        }),
      }),
    })
  }

  dropNotNull(): AlterTableExecutor {
    return new AlterTableExecutor({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: AlterTableNode.cloneWith(this.#alterTableNode, {
        alterColumn: AlterColumnNode.cloneWith(this.#alterColumnNode, {
          dropNotNull: true,
        }),
      }),
    })
  }
}

export class AlterTableExecutor implements OperationNodeSource, Compilable {
  readonly #queryId: QueryId
  readonly #alterTableNode: AlterTableNode
  readonly #executor: QueryExecutor

  constructor(args: AlterTableExecutorConstructorArgs) {
    this.#queryId = args.queryId
    this.#alterTableNode = args.alterTableNode
    this.#executor = args.executor
  }

  toOperationNode(): AlterTableNode {
    return this.#executor.transformQuery(this.#alterTableNode, this.#queryId)
  }

  compile(): CompiledQuery {
    return this.#executor.compileQuery(this.toOperationNode(), this.#queryId)
  }

  async execute(): Promise<void> {
    await this.#executor.executeQuery(this.compile(), this.#queryId)
  }
}

export class AlterTableAddColumnBuilder
  implements ColumnDefinitionBuilderInterface<AlterTableAddColumnBuilder>
{
  readonly #queryId: QueryId
  readonly #alterTableNode: AlterTableNode
  readonly #executor: QueryExecutor
  readonly #columnBuilder: ColumnDefinitionBuilder

  constructor(args: AlterTableAddColumnBuilderConstructorArgs) {
    this.#queryId = args.queryId
    this.#alterTableNode = args.alterTableNode
    this.#executor = args.executor
    this.#columnBuilder = args.columnBuilder
  }

  increments(): AlterTableAddColumnBuilder {
    return new AlterTableAddColumnBuilder({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: this.#alterTableNode,
      columnBuilder: this.#columnBuilder.increments(),
    })
  }

  primaryKey(): AlterTableAddColumnBuilder {
    return new AlterTableAddColumnBuilder({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: this.#alterTableNode,
      columnBuilder: this.#columnBuilder.primaryKey(),
    })
  }

  references(ref: string): AlterTableAddColumnBuilder {
    return new AlterTableAddColumnBuilder({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: this.#alterTableNode,
      columnBuilder: this.#columnBuilder.references(ref),
    })
  }

  onDelete(onDelete: OnDelete): AlterTableAddColumnBuilder {
    return new AlterTableAddColumnBuilder({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: this.#alterTableNode,
      columnBuilder: this.#columnBuilder.onDelete(onDelete),
    })
  }

  unique(): AlterTableAddColumnBuilder {
    return new AlterTableAddColumnBuilder({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: this.#alterTableNode,
      columnBuilder: this.#columnBuilder.unique(),
    })
  }

  notNull(): AlterTableAddColumnBuilder {
    return new AlterTableAddColumnBuilder({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: this.#alterTableNode,
      columnBuilder: this.#columnBuilder.notNull(),
    })
  }

  defaultTo(value: PrimitiveValue | AnyRawBuilder): AlterTableAddColumnBuilder {
    return new AlterTableAddColumnBuilder({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: this.#alterTableNode,
      columnBuilder: this.#columnBuilder.defaultTo(value),
    })
  }

  check(sql: string): AlterTableAddColumnBuilder {
    return new AlterTableAddColumnBuilder({
      queryId: this.#queryId,
      executor: this.#executor,
      alterTableNode: this.#alterTableNode,
      columnBuilder: this.#columnBuilder.check(sql),
    })
  }

  toOperationNode(): AlterTableNode {
    return this.#executor.transformQuery(
      AlterTableNode.cloneWith(this.#alterTableNode, {
        addColumn: AddColumnNode.create(this.#columnBuilder.toOperationNode()),
      }),
      this.#queryId
    )
  }

  compile(): CompiledQuery {
    return this.#executor.compileQuery(this.toOperationNode(), this.#queryId)
  }

  async execute(): Promise<void> {
    await this.#executor.executeQuery(this.compile(), this.#queryId)
  }
}

preventAwait(AlterTableBuilder, "don't await AlterTableBuilder instances")
preventAwait(AlterColumnBuilder, "don't await AlterColumnBuilder instances")

preventAwait(
  AlterTableExecutor,
  "don't await AlterTableExecutor instances directly. To execute the query you need to call `execute`"
)

preventAwait(
  AlterTableAddColumnBuilder,
  "don't await AlterTableAddColumnBuilder instances directly. To execute the query you need to call `execute`"
)

export interface AlterTableBuilderConstructorArgs {
  queryId: QueryId
  alterTableNode: AlterTableNode
  executor: QueryExecutor
}

export interface AlterColumnBuilderConstructorArgs
  extends AlterTableBuilderConstructorArgs {
  alterColumnNode: AlterColumnNode
}

export interface AlterTableExecutorConstructorArgs
  extends AlterTableBuilderConstructorArgs {}

export interface AlterTableAddColumnBuilderConstructorArgs
  extends AlterTableBuilderConstructorArgs {
  columnBuilder: ColumnDefinitionBuilder
}
