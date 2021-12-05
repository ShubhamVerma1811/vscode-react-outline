import * as vscode from "vscode";
import { getSymbolTree } from "./parser";

export function activate(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: "file", language: "typescriptreact" },
      new ReactOutlineSymbolProvider()
    ),
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: "file", language: "javascriptreact" },
      new ReactOutlineSymbolProvider()
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}

class ReactOutlineSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Thenable<vscode.DocumentSymbol[]> {
    const symbols = getSymbolTree(document.getText());
    return Promise.resolve(symbols);
  }
}
