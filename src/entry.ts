import { App, MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { KANBAN_VIEW_NAME, KanbanView } from "./ui/text_view";
import { GlobalSettingTab } from "./ui/settings/global_settings_tab";

interface GlobalSettings {
	installedAtVersion?: string;
	defaultTaskPath?: string;
}

const defaultGlobalSettings: GlobalSettings = {};

export default class Base extends Plugin {
	globalSettings: GlobalSettings;

	constructor(app: App, manifest: any) {
		super(app, manifest);
		this.globalSettings = defaultGlobalSettings;
	}

	async onload() {
		this.registerView(KANBAN_VIEW_NAME, (leaf) => new KanbanView(leaf));

		// Load and merge settings with defaults
		await this.loadGlobalSettings();

		this.addSettingTab(new GlobalSettingTab(this.app, this));

		this.switchToKanbanAfterLoad();

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.switchToKanbanAfterLoad();
			})
		);

		this.app.workspace.on("file-menu", (menu, file) => {
			menu.addItem((item) => {
				item.setTitle("New kanban")
					.setIcon("square-kanban")
					.onClick(async () => {
						const newFile = await this.app.vault.create(
							file.path + "/Kanban-" + Date.now() + ".md",
							`---\nkanban_plugin: {}\n---\n`
						);
						this.app.workspace
							.getActiveViewOfType(MarkdownView)
							?.leaf.openFile(newFile);
					});
			});
		});
	}

	async onunload() {
		await this.saveGlobalSettings();
	}

	private switchToKanbanAfterLoad() {
		this.app.workspace.onLayoutReady(() => {
			let leaf: WorkspaceLeaf;
			for (leaf of this.app.workspace.getLeavesOfType("markdown")) {
				if (
					leaf.view instanceof MarkdownView &&
					this.isKanbanFile(leaf.view.file)
				) {
					this.setKanbanView(leaf);
				}
			}
		});
	}

	private isKanbanFile(file: TFile | null): boolean {
		if (!file) {
			return false;
		}

		const fileCache = this.app.metadataCache.getFileCache(file);
		return (
			!!fileCache?.frontmatter && !!fileCache.frontmatter["kanban_plugin"]
		);
	}

	private async setKanbanView(leaf: WorkspaceLeaf) {
		await leaf.setViewState({
			type: KANBAN_VIEW_NAME,
			state: leaf.view.getState(),
		});
	}

	async loadGlobalSettings() {
		// Retrieve any saved data
		let savedData = await this.loadData();

		if (!savedData || Object.keys(savedData).length === 0) {
			await this.safeSetGlobalSettings(savedData || {});

			if (!savedData || Object.keys(savedData).length === 0)
				await this.saveGlobalSettings();
		} else {
			// just load the settings
			await this.safeSetGlobalSettings(savedData);
		}
	}

	private async safeSetGlobalSettings(settingsData: any) {
		if (!settingsData || typeof settingsData !== "object") {
			settingsData = {};
		}

		// in case saved data does not exist, the plugin was installed now or before 1.3, so add current version to settings, load them and save them
		if (!settingsData.installedAtVersion) {
			settingsData.installedAtVersion = this.manifest.version;

			this.globalSettings = {
				...defaultGlobalSettings,
				...settingsData,
			};
			// Make sure to save the settings with the new installedAtVersion
			await this.saveGlobalSettings();
			return;
		}

		// if there is an installedAtVersion, it means the plugin was opened after the 1.3 update
		// If the current version is up to date enough, it will not be included in dontApplyDefaultTaskLocationVersions,
		// since a this is intended to hold some older versions that should not apply the default task location
		// thus, the default task location will be applied if it has installedAtVersion and is not in the dontApplyDefaultTaskLocationVersions array
		// TODO uncomment else if block to apply default task location

		// Uncomment From here, adjust the version numbers as needed:
		// const dontApplyDefaultTaskLocationVersions = ["1.3"];
		// else if (
		// 	!dontApplyDefaultTaskLocationVersions.includes(
		// 		this.manifest.version
		// 	)
		// ) {
		// 	settingsData.defaultTaskPath = "Tasks.md";
		// }

		this.globalSettings = {
			...defaultGlobalSettings,
			...settingsData,
		};
	}

	async saveGlobalSettings() {
		await this.saveData(this.globalSettings);
	}
}
