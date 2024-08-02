import { ParseResult, parse } from "@babel/parser";
import traverse, { NodePath, TraverseOptions, VisitNodeObject } from "@babel/traverse";
import { File, JSXElement, JSXFragment } from '@babel/types'
import { DocumentSymbol, Position, Range, SymbolKind } from "vscode";
import { SourceLocation } from "estree";


type Node = JSXElement | JSXFragment

type StackItem = {
    node: Node,
    documentSymbol?: DocumentSymbol
    children: StackItem[]
}
export class Parse {
    private ast: ParseResult<File>
    private inStack: StackItem[] = []
    private tree: StackItem[] = []
    private documentSymbolTree: DocumentSymbol[] = []
    constructor(code: string) {
        this.ast = parse(code, {
            sourceType: "module",
            plugins: ["jsx", "typescript"]
        })
        this.traverse()
        this.vistor()
        this.tree2DocumentSymbolTree(this.tree, this.documentSymbolTree)

    }

    private getRange(loc: SourceLocation) {
        if (!loc) {
            throw new Error("No location");
        }
        const position = new Position(loc?.start.line - 1, loc?.start.column - 1);
        const range = new Range(position, position);

        return range;
    }

    private generateDocumentSymbol(
        name: string,
        detail: string,
        symbol: SymbolKind,
        range: Range
    ): DocumentSymbol {
        return new DocumentSymbol(name, detail, symbol, range, range);
    }

    private traverse() {
        try {
            // @ts-ignore
            traverse(this.ast, this.vistor());
        } catch (err) {
            console.error('traverse error', err);
            throw err
        }
    }

    private getInStackLast(): undefined | StackItem {
        return this.inStack[this.inStack.length - 1]
    }

    private vistor(): TraverseOptions<Node> {
        const visitNodeObject: VisitNodeObject<Node, Node> = {
            enter: (path: NodePath<Node>) => {
                this.inStack.push({
                    node: path.node,
                    children: []
                })
            },
            exit: (path: NodePath<Node>) => {
                if (this.getInStackLast()?.node === path.node) {
                    const popItem = this.inStack.pop()
                    if (popItem) {
                        let name = ''
                        // @ts-ignore 
                        if (popItem.node.openingElement?.name && popItem.node.openingElement.name.type === 'JSXMemberExpression') {
                            // @ts-ignore 
                            name = popItem.node.openingElement.name.object.name + '.' + popItem.node.openingElement.name.property.name
                        } else {
                            if (popItem.node.type === 'JSXFragment') {
                                name = '<></>'
                            } else {
                                // @ts-ignore 
                                name = popItem.node.openingElement.name.name
                            }
                        }
                        popItem.documentSymbol = this.generateDocumentSymbol(name, '', SymbolKind.Variable, this.getRange(popItem.node.loc!))
                        popItem.documentSymbol.children = []
                    }
                    if (this.getInStackLast()) {
                        popItem && this.getInStackLast()?.children.push(popItem)
                    } else {
                        popItem && this.tree.push(popItem)
                    }
                }
            }
        }
        const visitor: TraverseOptions<Node> = {
            'JSXElement': visitNodeObject,
            'JSXFragment': visitNodeObject
        }
        return visitor
    }

    getDocumentSymbolTree() {
        return this.documentSymbolTree
    }

    private tree2DocumentSymbolTree(tree: StackItem[], resultTree: DocumentSymbol[]) {
        for (const item of tree) {
            if (item.children) {
                this.tree2DocumentSymbolTree(item.children, item.documentSymbol!.children)
            }
            resultTree.push(item.documentSymbol!)
        }
    }
}
