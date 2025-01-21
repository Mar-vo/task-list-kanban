import { App, PluginSettingTab, Setting } from "obsidian";
import Base from "../../entry";

export class GlobalSettingTab extends PluginSettingTab {
	plugin: Base;

	constructor(app: App, plugin: Base) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Date format")
			.setDesc("Default date format")
			.addText((text) => text.setPlaceholder("MMMM dd, yyyy"));
	}
}
