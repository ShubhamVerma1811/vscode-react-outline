import * as vscode from "vscode";
import { Parse } from './parse'
export function activate(ctx: vscode.ExtensionContext): void {
  showNewVersionMessage(ctx);
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

export function deactivate() { }

class ReactDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument,
  ): Thenable<vscode.DocumentSymbol[]> {
    return new Promise((resolve) => {
      const parse = new Parse(document.getText());
      const symbols = parse.getDocumentSymbolTree();
      resolve(symbols);
    });
  }
}

async function showNewVersionMessage(context: vscode.ExtensionContext) {
  const ID = "shubhamverma18.react-outline";
  const VERSION = `${ID}:version`;
  const pkgJSON = vscode.extensions.getExtension(ID)?.packageJSON;

  const oldVersion = context.globalState.get(VERSION);
  const currentVersion = pkgJSON.version;

  if (oldVersion !== currentVersion) {
    const answer = await vscode.window.showInformationMessage(
      `React Outline updated to ${currentVersion}!
      It requires your contribution. Head over to the repository and contribute!`,
      "Open Repository",
      "Close"
    );

    if (answer === "Open Repository") {
      vscode.commands.executeCommand(
        "vscode.open",
        vscode.Uri.parse(pkgJSON?.repository?.url)
      );
    }

    context.globalState.update(VERSION, currentVersion);
    return;
  }
}
