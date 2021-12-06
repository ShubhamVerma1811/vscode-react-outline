import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import { JSXElement } from "@babel/types";
import { DocumentSymbol, Position, Range, SymbolKind } from "vscode";

let firstJSXElement: NodePath<JSXElement>["node"];

export const getSymbolTree = (code: string): DocumentSymbol[] => {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });

  // TODO: Look for better way, maybe traverse recursively inside the preOrder?
  traverse(ast, {
    JSXElement(path) {
      firstJSXElement = path.node;
      path.stop();
    }
  });

  const symbols = preOrderTraversal(firstJSXElement);

  return [symbols];
};

// TODO: handle for Fragement and JSXExpressions
const preOrderTraversal = (node: NodePath<JSXElement>["node"]) => {
  let symbol: DocumentSymbol;
  const { openingElement, loc, children } = node;

  const range = new Range(
    // @ts-ignore
    new Position(loc?.start.line, loc?.start.column),
    // @ts-ignore

    new Position(loc?.start.line, loc?.start.column)
  );

  symbol = new DocumentSymbol(
    // @ts-ignore
    openingElement.name.name,
    "",
    SymbolKind.Variable,
    range,
    range
  );

  for (const child of children) {
    if (child.type === "JSXElement") {
      const response = preOrderTraversal(child);
      symbol.children.push(response);
    }
  }

  return symbol;
};
