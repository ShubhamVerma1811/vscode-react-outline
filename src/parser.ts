import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import { JSXElement } from "@babel/types";
import { DocumentSymbol, Range, SymbolKind } from "vscode";

let firstJSXElement: NodePath<JSXElement>["node"];
let symbols: DocumentSymbol[] = [];

export const getSymbolTree = (code: string): DocumentSymbol[] => {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });

  traverse(ast, {
    JSXElement(path) {
      firstJSXElement = path.node;
      path.stop();
    }
  });

  preOrderTraversal(firstJSXElement);

  return symbols;
};

const preOrderTraversal = (node: NodePath<JSXElement>["node"]) => {
  let symbol: DocumentSymbol;

  const { openingElement, loc, children } = node;

  // TODO: nodes are in order but are getting repeated and symbols are not in order
  // TODO: something is wrong with the logic here.

  console.log("CURRENT NODE", openingElement.name.name);

  symbol = new DocumentSymbol(
    openingElement.name.name,
    "",
    SymbolKind.Function,
    new Range(0, 0, 0, 0),
    new Range(0, 0, 0, 0)
  );

  if (children.length > 0) {
    children.forEach((child) => {
      if (child.type === "JSXElement") {
        preOrderTraversal(child);
      }
    });
  }

  symbols.push(symbol);

  return;
};
