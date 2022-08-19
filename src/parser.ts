import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import {
  ConditionalExpression,
  JSXElement,
  JSXExpressionContainer,
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
  | LogicalExpression
  | JSXExpressionContainer;

export function getSymbolTree(code: string): DocumentSymbol[] {
  try {
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
  } catch (err) {
    console.error("React Outline Error:", err);
    return [];
  }
}

function parseDocumentSymbols(nodes: Node[]): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  for (const node of nodes) {
    const symbol = parseNode(node);
    symbol && symbols.push(symbol);
  }

  return symbols;
}

function parseNode(node: Node) {
  switch (node.type) {
    case "JSXElement":
      return parseJSXElement(node);
    case "JSXFragment":
      return parseJSXFragment(node);
    case "ConditionalExpression":
      return parseConditionalExpression(node);
    case "LogicalExpression":
      return parseLogicalExpression(node);
    case "JSXExpressionContainer":
      if (node.expression.type === "ConditionalExpression") {
        return parseConditionalExpression(node);
      } else if (node.expression.type === "LogicalExpression") {
        return parseLogicalExpression(node);
      }
    default:
      return null;
  }
}

function parseJSXElement(node: JSXElement) {
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
  const childs = parseChildren(children);
  childs && symbol.children.push(...childs);
  return symbol;
}

function parseJSXFragment(node: JSXFragment): DocumentSymbol {
  if (!node.loc) {
    throw new Error("No LOC");
  }

  let symbol: DocumentSymbol = generateDocumentSymbol(
    "Fragment",
    "",
    SymbolKind.Function,
    getRange(node.loc)
  );
  const childs = parseChildren(node?.children);
  childs && symbol.children.push(...childs);
  return symbol;
}

function parseLogicalExpression(node: any) {
  let left, right;
  const exp = node?.expression;

  // TODO: WHY DID I ADD THIS CONDITION HERE? I AM NOT TOUCHING THIS
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

  const childs = parseChildren([left, right]);
  childs && symbol.children.push(...childs);

  return symbol;
}

function parseConditionalExpression(node: any) {
  const exp = node?.expression;
  let alternate, consequent;

  // TODO: WHY DID I ADD THIS CONDITION HERE? I AM NOT TOUCHING THIS
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

  const childs = parseChildren([alternate, consequent]);
  childs && symbol.children.push(...childs);

  return symbol;
}

// TODO: ADD TYPES HERE
// @ts-ignore
function parseChildren(children) {
  const childs = [];
  for (const child of children) {
    const res = parseNode(child);
    res && childs.push(res);
  }
  return childs;
}

function getRange(loc: SourceLocation) {
  if (!loc) {
    throw new Error("No location");
  }
  const position = new Position(loc?.start.line - 1, loc?.start.column - 1);
  const range = new Range(position, position);

  return range;
}

function generateDocumentSymbol(
  name: string,
  detail: string,
  symbol: SymbolKind,
  range: Range
): DocumentSymbol {
  return new DocumentSymbol(name, detail, symbol, range, range);
}

// TODO: PENDING WORK
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
