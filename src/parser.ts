/*
  TODO: REFACTOR and TYPINGS
  * - Make generics functions to parse any type of node
  * - Right now there is duplicated code
  * @ShubhamVerma1811 - Take a look at this in the future
*/

import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import {
  ConditionalExpression,
  JSXElement,
  JSXFragment,
  JSXMemberExpression,
  LogicalExpression,
  SourceLocation
} from "@babel/types";
import { DocumentSymbol, Position, Range, SymbolKind } from "vscode";

type Node =
  | JSXElement
  | JSXFragment
  | JSXMemberExpression
  | ConditionalExpression
  | LogicalExpression;

export const getSymbolTree = (code: string): DocumentSymbol[] => {
  const nodes: Node[] = [];
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });

  traverse(ast, {
    JSXElement(path) {
      nodes.push(path.node);
      path.stop();
    },
    JSXFragment(path) {
      nodes.push(path.node);
      path.stop();
    }
  });

  const symbols = parseDocumentSymbols(nodes);
  return symbols;
};

const parseDocumentSymbols = (nodes: Node[]): DocumentSymbol[] => {
  const symbols: DocumentSymbol[] = [];
  for (const node of nodes) {
    if (node.type === "JSXElement") {
      const symbol = parseJSXElement(node);
      symbols.push(symbol);
    } else if (node.type === "JSXFragment") {
      const symbol = parseJSXFragment(node);
      symbols.push(symbol);
    } else if (node.type === "ConditionalExpression") {
      const symbol = parseConditionalExpression(node);
      symbols.push(symbol);
    } else if (node.type === "LogicalExpression") {
      const symbol = parseLogicalExpression(node);
      symbols.push(symbol);
    }
  }

  return symbols;
};

const parseJSXElement = (node: JSXElement) => {
  const { children } = node;

  const name = () => {
    if (node.openingElement.name.type === "JSXMemberExpression") {
      // @ts-ignore
      return `${node.openingElement.name.object.name}.${node.openingElement.name.property.name}`;
    } else {
      return node.openingElement.name.name as string;
    }
  };

  const symbol = generateDocumentSymbol(
    name(),
    "",
    SymbolKind.Variable,
    // @ts-ignore
    getRange(node.loc)
  );
  parseChildren<typeof children>(symbol, children);

  return symbol;
};

const parseJSXFragment = (node: JSXFragment): DocumentSymbol => {
  if (!node.loc) {
    throw new Error("No LOC");
  }

  let symbol: DocumentSymbol = generateDocumentSymbol(
    "Fragment",
    "",
    SymbolKind.Function,
    getRange(node.loc)
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
    } else if (child.type === "JSXExpressionContainer") {
      if (child.expression.type === "ConditionalExpression") {
        const response = parseConditionalExpression(child);
        symbol.children.push(response);
      } else if (child.expression.type === "LogicalExpression") {
        const response = parseLogicalExpression(child);
        symbol.children.push(response);
      }
    }
  }
}

const parseCallExpression = (node: any) => {
  const args = node.expression.arguments;
  const exp = args[0];

  if (exp.type === "ArrowFunctionExpression") {
    if (
      exp.body.type === "BlockStatement" &&
      exp.body.body[0].type === "ReturnStatement"
    ) {
      if (exp.body.body[0].argument.type === "JSXElement") {
        return parseJSXElement(exp.body.body[0].argument);
      } else if (exp.body.body[0].argument.type === "ConditionalExpression") {
        return parseConditionalExpression(exp.body.body[0].argument);
      } else if (exp.body.body[0].argument.type === "LogicalExpression") {
        return parseLogicalExpression(exp.body.body[0].argument);
      }
    }
    if (exp.body.type === "JSXElement") {
      return parseJSXElement(exp.body);
    } else if (exp.body.type === "ConditionalExpression") {
      return parseConditionalExpression(exp.body);
    } else if (exp.body.type === "LogicalExpression") {
      return parseLogicalExpression(exp.body);
    }
  }
};

const parseConditionalExpression = (node: any) => {
  const exp = node?.expression;
  let alternate, consequent;

  if (exp) {
    alternate = exp.alternate;
    consequent = exp.consequent;
  } else {
    alternate = node.alternate;
    consequent = node.consequent;
  }

  const { loc } = node;
  if (!loc) {
    throw new Error("No location");
  }

  const symbol: DocumentSymbol = generateDocumentSymbol(
    "ConditionalExpression",
    "",
    SymbolKind.Class,
    getRange(loc)
  );

  parseChildren<typeof consequent>(symbol, [consequent]);
  parseChildren<typeof alternate>(symbol, [alternate]);

  return symbol;
};

const parseLogicalExpression = (node: any) => {
  let left, right;
  const exp = node?.expression;

  if (exp) {
    left = exp.left;
    right = exp.right;
  } else {
    left = node.left;
    right = node.right;
  }

  const symbol = generateDocumentSymbol(
    "LogicalExpression",
    "",
    SymbolKind.Class,
    getRange(node.loc)
  );

  parseChildren<typeof left>(symbol, [left]);
  parseChildren<typeof right>(symbol, [right]);

  return symbol;
};

const getRange = (loc: SourceLocation) => {
  if (!loc) {
    throw new Error("No location");
  }
  const position = new Position(loc?.start.line - 1, loc?.start.column - 1);
  const range = new Range(position, position);

  return range;
};

const generateDocumentSymbol = (
  name: string,
  detail: string,
  symbol: SymbolKind,
  range: Range
): DocumentSymbol => {
  return new DocumentSymbol(name, detail, symbol, range, range);
};
