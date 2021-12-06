import * as vscode from "vscode";
import { getSymbolTree } from "./parser";

export function activate(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: "file", language: "typescriptreact" },
      new ReactDocumentSymbolProvider()
    ),
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: "file", language: "javascriptreact" },
      new ReactDocumentSymbolProvider()
    )
  );
}

export function deactivate() {}

class ReactDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Thenable<vscode.DocumentSymbol[]> {
    return new Promise((resolve, reject) => {
      const symbols = getSymbolTree(document.getText());
      resolve(symbols);
    });
  }
}
