// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

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
  ): Thenable<vscode.SymbolInformation[]> {
    let symbols: vscode.SymbolInformation[] = [];

    return new Promise((resolve, reject) => {
      for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        // regec to match the tag name
        if (line.text.match(/<[a-zA-Z]+[^>]*>/g)) {
          // get the tag name without the "<"
          const name = line.text
            .match(/<([^\s>]+)(\s|>)+/g)?.[0]
            ?.split("<")?.[1];
          symbols.push(
            new vscode.SymbolInformation(
              name || "unknown component",
              vscode.SymbolKind.Function,
              "",
              new vscode.Location(document.uri, line.range)
            )
          );
        }
      }
      resolve(symbols);
    });
  }
}
