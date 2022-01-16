import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import { JSXElement, JSXFragment, JSXMemberExpression } from "@babel/types";
import { DocumentSymbol, Position, Range, SymbolKind } from "vscode";

type Node = JSXElement | JSXFragment | JSXMemberExpression;

export const getSymbolTree = (code: string): DocumentSymbol[] => {
  const nodes: Node[] = [];
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });

  traverse(ast, {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    JSXElement(path) {
      nodes.push(path.node);
      path.stop();
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    JSXFragment(path) {
      nodes.push(path.node);
      path.stop();
    }
    // TODO: handle JSXExpression, ConditionalExpression, LogicalExpression
  });

  const symbols = parseDocumentSymbols(nodes);
  return symbols;
};

const generateSymbolTree = (
  node: NodePath<JSXElement>["node"]
): DocumentSymbol => {
  const { openingElement, loc } = node;
  if (!loc) {
    throw new Error("No location");
  }

  const position = new Position(loc?.start.line - 1, loc?.start.column - 1);
  const range = new Range(position, position);

  const name = () => {
    if (openingElement.name.type === "JSXMemberExpression") {
      // @ts-ignore
      return `${openingElement.name.object.name}.${openingElement.name.property.name}`;
    } else {
      return openingElement.name.name;
    }
  };

  return new DocumentSymbol(
    // TODO: fix types
    // @ts-ignore
    name(),
    "",
    SymbolKind.Variable,
    range,
    range
  );
};

const parseDocumentSymbols = (nodes: Node[]): DocumentSymbol[] => {
  const symbols: DocumentSymbol[] = [];
  nodes.forEach((node) => {
    if (node.type === "JSXElement") {
      const symbol = parseJSXElement(node);
      symbols.push(symbol);
    } else if (node.type === "JSXFragment") {
      const symbol = parseJSXFragment(node);

      symbols.push(symbol);
    }
  });

  return symbols;
};

const parseJSXElement = (node: JSXElement) => {
  let symbol: DocumentSymbol;
  const { children } = node;

  symbol = generateSymbolTree(node);
  parseChildren<typeof children>(symbol, children);

  return symbol;
};

// TODO: refactor
const parseJSXFragment = (node: JSXFragment): DocumentSymbol => {
  if (!node.loc) {
    throw new Error("No LOC");
  }
  const position = new Position(
    node.loc?.start.line - 1,
    node.loc?.start.column - 1
  );
  const range = new Range(position, position);

  let symbol: DocumentSymbol = new DocumentSymbol(
    "Fragment",
    "",
    SymbolKind.Field,
    range,
    range
  );

  parseChildren<typeof node.children>(symbol, node?.children);
  return symbol;
};

function parseChildren<T extends Array<any>>(
  symbol: DocumentSymbol,
  _children: T
) {
  for (const child of _children) {
    if (child.type === "JSXElement") {
      const response = parseJSXElement(child);
      symbol.children.push(response);
    } else if (child.type === "JSXFragment") {
      symbol.children.push(parseJSXFragment(child));
    }
  }
}
