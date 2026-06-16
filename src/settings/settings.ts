import {
    addIcon,
    ExtraButtonComponent,
    normalizePath,
    Notice,
    PluginSettingTab,
    setIcon,
    Setting,
    TextComponent,
    TFolder
} from "obsidian";

import type InitiativeTracker from "../main";

import { PlayerSuggestionModal } from "../utils/suggester";
import { FileInputSuggest, FolderInputSuggest } from "obsidian-utilities";
import {
    AC,
    Conditions,
    DEFAULT_UNDEFINED,
    EDIT,
    HP,
    INITIATIVE,
    OVERFLOW_TYPE,
    RESOLVE_TIES
} from "../utils";
import { RpgSystemSetting, getRpgSystem } from "../utils/rpg-system";
import type { Party } from "./settings.types";
import type { InputValidate } from "./settings.types";
import type { Condition } from "src/types/creatures";
import type { HomebrewCreature } from "src/types/creatures";

export default class InitiativeTrackerSettings extends PluginSettingTab {
    constructor(private plugin: InitiativeTracker) {
        super(plugin.app, plugin);
    }
    async display(): Promise<void> {
        try {
            let { containerEl } = this;

            containerEl.empty();
            containerEl.addClass("initiative-tracker-settings");

            containerEl.createEl("h2", { text: "Настройки Initiative Tracker" });

            this._displayBase(containerEl.createDiv());
            if (!this.plugin.data.openState) {
                this.plugin.data.openState = {
                    battle: true,
                    player: true,
                    party: true,
                    plugin: true,
                    status: true,
                    builder: true
                };
            }
            this._displayBattle(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.player
                            ? { open: true }
                            : {})
                    }
                })
            );
            this._displayPlayers(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.player
                            ? { open: true }
                            : {})
                    }
                })
            );
            this._displayParties(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.party
                            ? { open: true }
                            : {})
                    }
                })
            );
            this._displayBuilder(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.builder
                            ? { open: true }
                            : {})
                    }
                })
            );
            this._displayStatuses(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.status
                            ? { open: true }
                            : {})
                    }
                })
            );
            this._displayIntegrations(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.plugin
                            ? { open: true }
                            : {})
                    }
                })
            );

            const div = containerEl.createDiv("coffee");
            div.createEl("a", {
                href: "https://www.buymeacoffee.com/valentine195"
            }).createEl("img", {
                attr: {
                    src: "https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=valentine195&button_colour=e3e7ef&font_colour=262626&font_family=Inter&outline_colour=262626&coffee_colour=ff0000"
                }
            });
        } catch (e) {
            console.error(e);
            new Notice(
                "Произошла ошибка при отображении вкладки настроек Obsidian Initiative Tracker."
            );
        }
    }

    private _displayBase(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Основные настройки");
        new Setting(containerEl)
            .setName("Показывать подсказки для новичков")
            .setDesc(
                "Отображать инструкции в трекере инициативы, чтобы помочь освоиться с работой."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.beginnerTips).onChange(
                    async (v) => {
                        this.plugin.data.beginnerTips = v;
                        await this.plugin.saveSettings();
                    }
                );
            });
        new Setting(containerEl)
            .setName("Показывать сложность столкновения")
            .setDesc(
                "Отображать сложность столкновения на основе ПО существ и уровня игроков. Существа без ПО или уровня в расчёт не включаются."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.displayDifficulty).onChange(
                    async (v) => {
                        this.plugin.data.displayDifficulty = v;
                        await this.plugin.saveSettings();
                    }
                );
            });
        new Setting(containerEl)
            .setName("Бросать инициативу для одинаковых существ вместе")
            .setDesc(
                "Одинаковые существа (с тем же именем и КД) по умолчанию будут получать одну и ту же инициативу."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.condense).onChange(async (v) => {
                    this.plugin.data.condense = v;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Встраивать содержимое statblock-link в окне существа")
            .setDesc(
                "Предпочитать встроенное содержимое из атрибута statblock-link, если он указан. Если ссылка отсутствует, а плагин TTRPG включён, использовать его."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.preferStatblockLink).onChange(
                    async (v) => {
                        this.plugin.data.preferStatblockLink = v;
                        await this.plugin.saveSettings();
                    }
                );
            });
    }
    private async _displayBattle(additionalContainer: HTMLDetailsElement) {
        additionalContainer.empty();
        additionalContainer.ontoggle = () => {
            this.plugin.data.openState.battle = additionalContainer.open;
        };
        const summary = additionalContainer.createEl("summary");
        new Setting(summary).setHeading().setName("Бой");
        summary.createDiv("collapser").createDiv("handle");
        new Setting(additionalContainer)
            .setName("Ограничивать минимальные хиты")
            .setDesc(
                "Когда существо получает урон, который опустил бы его хиты ниже 0, хиты вместо этого устанавливаются в 0."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.clamp).onChange(async (v) => {
                    this.plugin.data.clamp = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(additionalContainer)
            .setName("Избыточное лечение")
            .setDesc(
                "Задаёт, что происходит с лечением, превышающим максимум хитов существа."
            )
            .addDropdown((d) => {
                d.addOption(OVERFLOW_TYPE.ignore, "Игнорировать");
                d.addOption(OVERFLOW_TYPE.temp, "Добавлять во временные хиты");
                d.addOption(OVERFLOW_TYPE.current, "Добавлять в текущие хиты");
                d.setValue(this.plugin.data.hpOverflow ?? OVERFLOW_TYPE.ignore);
                d.onChange(async (v) => {
                    this.plugin.data.hpOverflow = v;
                    this.plugin.saveSettings();
                });
            });
        new Setting(additionalContainer)
            .setName("Автоматически применять состояние «Без сознания»")
            .setDesc(
                'Когда существо получает урон, который опустил бы его хиты ниже 0, оно получает состояние «Без сознания».'
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.autoStatus).onChange(async (v) => {
                    this.plugin.data.autoStatus = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(additionalContainer)
            .setName("Суммировать временные хиты")
            .setDesc(
                "Любые временные хиты, добавленные существу, будут прибавляться к уже имеющимся временным хитам."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.additiveTemp).onChange(
                    async (v) => {
                        this.plugin.data.additiveTemp = v;
                        await this.plugin.saveSettings();
                    }
                );
            });
        new Setting(additionalContainer)
            .setName("Показывать хиты игроков в окне игрока")
            .setDesc(
                "Если отключено, здоровье игрока будет отображаться как «Здоров», «Ранен» и т. п."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.diplayPlayerHPValues).onChange(
                    async (v) => {
                        this.plugin.data.diplayPlayerHPValues = v;
                        await this.plugin.saveSettings();
                    }
                );
            });
        new Setting(additionalContainer)
            .setName("Бросать хиты для существ")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Существа, добавляемые в столкновения, будут автоматически бросать хиты, если у существа задано свойство "
                    });
                    e.createEl("code", { text: "hit_dice" });
                    e.createSpan({
                        text: "."
                    });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.rollHP).onChange(async (v) => {
                    this.plugin.data.rollHP = v;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(additionalContainer)
            .setName("Вести журнал боёв")
            .setDesc(
                "Действия, совершаемые во время боя, будут записываться в указанную папку журнала."
            )
            .addToggle((t) =>
                t.setValue(this.plugin.data.logging).onChange(async (v) => {
                    this.plugin.data.logging = v;
                    await this.plugin.saveSettings();
                })
            );

        const exists = await this.plugin.app.vault.adapter.exists(
            this.plugin.data.logFolder
        );
        new Setting(additionalContainer)
            .setName("Папка журнала")
            .setDesc(
                createFragment(async (e) => {
                    e.createSpan({
                        text: "В этой папке для каждого боя будет создаваться новая заметка."
                    });
                    e.createEl("br");
                    e.createSpan({ text: "Текущая: " });
                    e.createEl("code", { text: this.plugin.data.logFolder });

                    if (!exists) {
                        e.createEl("br");
                        const container = e.createDiv(
                            "initiative-tracker-warning"
                        );
                        setIcon(container, "initiative-tracker-warning");
                        container.createSpan({
                            text: "Эта папка не существует и будет создана при первой записи файла журнала."
                        });
                    }
                })
            )
            .addText((t) => {
                t.setValue(this.plugin.data.logFolder);
                let folders = this.app.vault
                    .getAllLoadedFiles()
                    .filter((f) => f instanceof TFolder);
                const modal = new FolderInputSuggest(
                    this.app,
                    t,
                    folders as TFolder[]
                );
                modal.onSelect(async ({ item }) => {
                    this.plugin.data.logFolder = normalizePath(item.path);
                    await this.plugin.saveSettings();
                    this.display();
                });
            });
        new Setting(additionalContainer)
            .setName("Разрешение совпадений инициативы")
            .setDesc(
                "Определяет, что происходит, если у двух существ одинаковая инициатива."
            )
            .addDropdown((d) => {
                d.addOption(RESOLVE_TIES.playerFirst, "Сначала игрок");
                d.addOption(RESOLVE_TIES.npcFirst, "Сначала НИП");
                d.addOption(RESOLVE_TIES.random, "Случайно");
                d.setValue(
                    this.plugin.data.resolveTies ?? RESOLVE_TIES.playerFirst
                );
                d.onChange(async (v) => {
                    this.plugin.data.resolveTies = v;
                    this.plugin.saveSettings();
                });
            });
    }
    private _displayPlayers(additionalContainer: HTMLDetailsElement) {
        additionalContainer.empty();
        additionalContainer.ontoggle = () => {
            this.plugin.data.openState.player = additionalContainer.open;
        };
        const summary = additionalContainer.createEl("summary");
        new Setting(summary).setHeading().setName("Игроки");
        summary.createDiv("collapser").createDiv("handle");
        new Setting(additionalContainer)
            .setName("Добавить нового игрока")
            .setDesc(
                "Добавленные здесь игроки будут доступны для добавления в отряд. Если у вас нет созданного отряда, все игроки будут добавлены в новое столкновение."
            )
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Добавить игрока")
                    .setButtonText("+")
                    .onClick(async () => {
                        const modal = new NewPlayerModal(this.plugin);
                        modal.open();
                        modal.onClose = async () => {
                            if (!modal.saved) return;

                            await this.plugin.savePlayer({
                                ...modal.player,
                                player: true
                            });

                            this._displayPlayers(additionalContainer);
                        };
                    });

                return b;
            });
        const additional = additionalContainer.createDiv("additional");
        const playerView = additional.createDiv("initiative-tracker-players");
        if (!this.plugin.players.size) {
            additional
                .createDiv({
                    attr: {
                        style: "display: flex; justify-content: center; padding-bottom: 18px;"
                    }
                })
                .createSpan({
                    text: "Нет сохранённых игроков! Создайте игрока, чтобы увидеть его здесь."
                });
        } else {
            const headers = playerView.createDiv(
                "initiative-tracker-player headers"
            );

            headers.createDiv({ text: "Имя" });
            setIcon(
                headers.createDiv({
                    attr: {
                        "aria-label": "Уровень"
                    }
                }),
                "swords"
            );
            setIcon(
                headers.createDiv({
                    attr: {
                        "aria-label": "Макс. хиты"
                    }
                }),
                HP
            );
            setIcon(
                headers.createDiv({
                    attr: {
                        "aria-label": "Класс доспеха"
                    }
                }),
                AC
            );
            setIcon(
                headers.createDiv({
                    attr: {
                        "aria-label": "Модификатор инициативы"
                    }
                }),
                INITIATIVE
            );
            headers.createDiv();

            for (let player of this.plugin.data.players) {
                const playerDiv = playerView.createDiv(
                    "initiative-tracker-player"
                );
                playerDiv.createDiv({ text: player.name });
                playerDiv.createDiv({
                    text: `${player.level ?? DEFAULT_UNDEFINED}`
                });
                playerDiv.createDiv({
                    text: `${player.hp ?? DEFAULT_UNDEFINED}`
                });
                playerDiv.createDiv({
                    text: `${player.ac ?? DEFAULT_UNDEFINED}`
                });
                playerDiv.createDiv({
                    text: `${player.modifier ?? DEFAULT_UNDEFINED}`
                });
                const icons = playerDiv.createDiv(
                    "initiative-tracker-player-icon"
                );
                new ExtraButtonComponent(icons.createDiv())
                    .setIcon("pencil")
                    .setTooltip("Изменить")
                    .onClick(() => {
                        const modal = new NewPlayerModal(this.plugin, player);
                        modal.open();
                        modal.onClose = async () => {
                            if (!modal.saved) return;
                            await this.plugin.updatePlayer(
                                player,
                                modal.player
                            );

                            this._displayPlayers(additionalContainer);
                        };
                    });
                new ExtraButtonComponent(icons.createDiv())
                    .setIcon("trash")
                    .setTooltip("Удалить")
                    .onClick(async () => {
                        this.plugin.deletePlayer(player);

                        await this.plugin.saveSettings();
                        this._displayPlayers(additionalContainer);
                    });
            }
            for (let [name, player] of this.plugin.statblock_players) {
                const playerDiv = playerView.createDiv(
                    "initiative-tracker-player"
                );
                playerDiv.createDiv({ text: name });
                playerDiv.createDiv({
                    text: `${player.level ?? DEFAULT_UNDEFINED}`
                });
                playerDiv.createDiv({
                    text: `${player.hp ?? DEFAULT_UNDEFINED}`
                });
                playerDiv.createDiv({
                    text: `${player.ac ?? DEFAULT_UNDEFINED}`
                });
                playerDiv.createDiv({
                    text: `${player.modifier ?? DEFAULT_UNDEFINED}`
                });
                const icons = playerDiv.createDiv({
                    cls: "initiative-tracker-player-icon imported",
                    attr: {
                        "aria-label": "Импортировано из Fantasy Statblocks"
                    }
                });
                setIcon(icons, "heart-handshake");
            }
        }
    }
    private _displayBuilder(additionalContainer: HTMLDetailsElement) {
        additionalContainer.empty();
        additionalContainer.ontoggle = () => {
            this.plugin.data.openState.player = additionalContainer.open;
        };
        const summary = additionalContainer.createEl("summary");
        new Setting(summary).setHeading().setName("Столкновения");
        summary.createDiv("collapser").createDiv("handle");
        const explanation = additionalContainer.createDiv(
            "initiative-tracker-explanation"
        );
        explanation.createEl("span", {
            text: "Конструктор столкновений позволяет быстро создавать столкновения, которые можно сохранить для дальнейшего использования или сразу запустить в бой."
        });
        explanation.createEl("br");
        explanation.createEl("br");
        explanation.createEl("span", {
            text: "Его можно открыть кнопкой на боковой панели (если включена) или командой «Открыть конструктор столкновений»."
        });
        new Setting(additionalContainer)
            .setName("Добавить кнопку на боковую панель")
            .setDesc(
                "На боковую панель будет добавлена кнопка для открытия конструктора столкновений."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.builder.sidebarIcon).onChange(
                    (v) => {
                        this.plugin.data.builder.sidebarIcon = v;
                        this.plugin.setBuilderIcon();
                    }
                );
            });
        new Setting(additionalContainer)
            .setName("Система опыта")
            .setDesc("Система опыта, используемая для столкновений")
            .addDropdown((d) => {
                Object.values(RpgSystemSetting).forEach((system) =>
                    d.addOption(
                        system,
                        getRpgSystem(this.plugin, system).displayName
                    )
                );
                d.setValue(
                    this.plugin.data.rpgSystem ?? RpgSystemSetting.Dnd5e
                );
                d.onChange(async (v) => {
                    this.plugin.data.rpgSystem = v;
                    this.plugin.saveSettings();
                });
            });

        const additional = additionalContainer.createDiv("additional");
        new Setting(additional).setHeading().setName("Сохранённые столкновения");
        if (!Object.keys(this.plugin.data.encounters).length) {
            additional
                .createDiv({
                    attr: {
                        style: "display: flex; justify-content: center; padding-bottom: 18px;"
                    }
                })
                .createSpan({
                    text: "Нет сохранённых столкновений! Создайте столкновение, чтобы увидеть его здесь."
                });
        } else {
            for (const [name, encounter] of Object.entries(
                this.plugin.data.encounters
            )) {
                new Setting(additional)
                    .setName(name)
                    .setDesc(
                        createFragment((e) => {
                            const players = [],
                                creatures = [];
                            for (const creature of encounter.creatures) {
                                if (creature.player) {
                                    players.push(creature.name);
                                } else {
                                    creatures.push(creature.name);
                                }
                            }

                            if (players.length) {
                                e.createSpan({
                                    text: `Игроки: ${players.join(", ")}`
                                });
                                e.createEl("br");
                            }
                            if (creatures.length) {
                                e.createSpan({
                                    text: `Существа: ${creatures.join(", ")}`
                                });
                                e.createEl("br");
                            }

                            if (encounter.timestamp) {
                                e.createSpan({
                                    text: `${new Date(
                                        encounter.timestamp
                                    ).toLocaleString()}`
                                });
                            }
                        })
                    )
                    .addExtraButton((b) => {
                        b.setIcon("trash").onClick(async () => {
                            this.plugin.removeEncounter(name);
                            await this.plugin.saveSettings();
                            this._displayBuilder(additionalContainer);
                        });
                    });
            }
        }
    }
    private _displayParties(additionalContainer: HTMLDetailsElement) {
        additionalContainer.empty();
        additionalContainer.ontoggle = () => {
            this.plugin.data.openState.party = additionalContainer.open;
        };
        const summary = additionalContainer.createEl("summary");
        new Setting(summary).setHeading().setName("Отряды");
        summary.createDiv("collapser").createDiv("handle");
        const explanation = additionalContainer.createDiv(
            "initiative-tracker-explanation"
        );
        explanation.createEl("span", {
            text: "Отряды позволяют создавать разные группы игроков. Каждый игрок может состоять в нескольких отрядах."
        });
        explanation.createEl("br");
        explanation.createEl("br");
        explanation.createEl("span", {
            text: "Вы можете задать отряд по умолчанию для столкновений или указать отряд для столкновения в его блоке. Во время прохождения столкновения в трекере можно сменить активный отряд, что позволяет быстро переключать, какие игроки участвуют в бою."
        });
        new Setting(additionalContainer)
            .setName("Отряд по умолчанию")
            .setDesc(
                "Трекер будет по умолчанию загружать этот отряд в столкновения."
            )
            .addDropdown((d) => {
                d.addOption("none", "Нет");
                for (const party of this.plugin.data.parties) {
                    d.addOption(party.name, party.name);
                }
                d.setValue(this.plugin.data.defaultParty ?? "none");
                d.onChange(async (v) => {
                    this.plugin.data.defaultParty = v == "none" ? null : v;
                    this.plugin.saveSettings();
                });
            });
        new Setting(additionalContainer)
            .setName("Добавить новый отряд")
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Добавить отряд")
                    .setButtonText("+")
                    .onClick(async () => {
                        const modal = new PartyModal(this.plugin);
                        modal.open();
                        modal.onClose = async () => {
                            if (modal.canceled) return;
                            if (!modal.party.name || !modal.party.name.length)
                                return;
                            if (
                                this.plugin.data.parties.filter(
                                    (party) => party.name == modal.party.name
                                )
                            ) {
                                const map = new Map(
                                    [...this.plugin.data.parties].map((c) => [
                                        c.name,
                                        c
                                    ])
                                );
                                map.set(modal.party.name, modal.party);
                                this.plugin.data.parties = Array.from(
                                    map.values()
                                );
                            } else {
                                this.plugin.data.parties.push(modal.party);
                            }

                            await this.plugin.saveSettings();

                            this._displayParties(additionalContainer);
                        };
                    });

                return b;
            });
        const additional = additionalContainer.createDiv("additional");
        if (!this.plugin.data.parties.length) {
            additional
                .createDiv({
                    attr: {
                        style: "display: flex; justify-content: center; padding-bottom: 18px;"
                    }
                })
                .createSpan({
                    text: "Нет сохранённых отрядов! Создайте отряд, чтобы увидеть его здесь."
                });
        } else {
            for (const party of this.plugin.data.parties) {
                new Setting(additional)
                    .setName(party.name)
                    .setDesc(party.players.join(", "))
                    .addExtraButton((b) => {
                        b.setIcon("pencil").onClick(() => {
                            const modal = new PartyModal(this.plugin, party);
                            modal.open();
                            modal.onClose = async () => {
                                if (modal.canceled) return;
                                if (
                                    !modal.party.name ||
                                    !modal.party.name.length
                                )
                                    return;

                                this.plugin.data.parties.splice(
                                    this.plugin.data.parties.indexOf(party),
                                    1,
                                    modal.party
                                );
                                if (
                                    this.plugin.data.parties.filter(
                                        (s) => s.name == modal.party.name
                                    ).length > 1
                                ) {
                                    if (
                                        this.plugin.data.parties.filter(
                                            (status) =>
                                                status.name == modal.party.name
                                        )
                                    ) {
                                        const map = new Map(
                                            this.plugin.data.parties.map(
                                                (c) => [c.name, c]
                                            )
                                        );
                                        map.set(modal.party.name, modal.party);
                                        this.plugin.data.parties = Array.from(
                                            map.values()
                                        );
                                    }
                                }

                                await this.plugin.saveSettings();

                                this._displayParties(additionalContainer);
                            };
                        });
                    })
                    .addExtraButton((b) => {
                        b.setIcon("trash").onClick(async () => {
                            this.plugin.data.parties =
                                this.plugin.data.parties.filter(
                                    (p) => p.name != party.name
                                );
                            if (this.plugin.data.defaultParty == party.name) {
                                this.plugin.data.defaultParty =
                                    this.plugin.data.parties[0]?.name ?? null;
                            }
                            await this.plugin.saveSettings();
                            this._displayParties(additionalContainer);
                        });
                    });
            }
        }
    }
    private _displayStatuses(additionalContainer: HTMLDetailsElement) {
        additionalContainer.empty();
        additionalContainer.ontoggle = () => {
            this.plugin.data.openState.status = additionalContainer.open;
        };
        const summary = additionalContainer.createEl("summary");
        new Setting(summary).setHeading().setName("Состояния");

        new Setting(additionalContainer)
            .setName("Состояние «Без сознания»")
            .setDesc(
                "Выберите другое состояние, используемое по умолчанию как «Без сознания»."
            )
            .addDropdown((d) => {
                for (const status of this.plugin.data.statuses) {
                    d.addOption(status.id, status.name);
                }
                d.setValue(this.plugin.data.unconsciousId);
                d.onChange((id) => (this.plugin.data.unconsciousId = id));
            });
        summary.createDiv("collapser").createDiv("handle");
        const add = new Setting(additionalContainer)
            .setName("Добавить новое состояние")
            .setDesc("Эти состояния можно будет применять к существам.")
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Добавить состояние")
                    .setButtonText("+")
                    .onClick(async () => {
                        const modal = new StatusModal(this.plugin);
                        modal.onClose = async () => {
                            if (modal.canceled) return;
                            if (!modal.status.name) return;
                            if (
                                this.plugin.data.statuses.filter(
                                    (status) => status.name == modal.status.name
                                )
                            ) {
                                const map = new Map(
                                    [...this.plugin.data.statuses].map((c) => [
                                        c.name,
                                        c
                                    ])
                                );
                                map.set(modal.status.name, modal.status);
                                this.plugin.data.statuses = Array.from(
                                    map.values()
                                );
                            } else {
                                this.plugin.data.statuses.push(modal.status);
                            }
                            await this.plugin.saveSettings();
                            this._displayStatuses(additionalContainer);
                        };
                        modal.open();
                    });

                return b;
            });
        if (!Conditions.every((c) => this.plugin.data.statuses.includes(c))) {
            add.addExtraButton((b) =>
                b
                    .setIcon("reset")
                    .setTooltip("Восстановить состояния по умолчанию")
                    .onClick(async () => {
                        this.plugin.data.statuses = Array.from(
                            new Map(
                                [
                                    ...this.plugin.data.statuses,
                                    ...Conditions
                                ].map((c) => [c.name, c])
                            ).values()
                        );
                        await this.plugin.saveSettings();
                        this._displayStatuses(additionalContainer);
                    })
            );
        }
        const additional = additionalContainer.createDiv("additional");
        for (const status of this.plugin.data.statuses) {
            new Setting(additional)
                .setName(
                    createFragment((e) => {
                        const div = e.createDiv("status-name-container");
                        div.createSpan({ text: status.name });

                        div.createDiv("status-metadata-container");
                        if (status.resetOnRound) {
                            setIcon(
                                div.createDiv({
                                    attr: {
                                        "aria-label": "Сбрасывается каждый раунд"
                                    }
                                }),
                                "timer-reset"
                            );
                        }
                        if (status.hasAmount) {
                            setIcon(
                                div.createDiv({
                                    attr: {
                                        "aria-label": "Имеет количество"
                                    }
                                }),
                                "hash"
                            );
                        }
                    })
                )
                .setDesc(status.description ?? "")
                .addExtraButton((b) =>
                    b.setIcon("pencil").onClick(() => {
                        const modal = new StatusModal(this.plugin, status);
                        modal.onClose = async () => {
                            if (modal.canceled) return;
                            if (!modal.status.name) return;
                            this.plugin.data.statuses.splice(
                                this.plugin.data.statuses.indexOf(status),
                                1,
                                modal.status
                            );
                            if (
                                this.plugin.data.statuses.filter(
                                    (s) => s.name == modal.status.name
                                ).length > 1
                            ) {
                                if (
                                    this.plugin.data.statuses.filter(
                                        (status) =>
                                            status.name == modal.status.name
                                    )
                                ) {
                                    const map = new Map(
                                        this.plugin.data.statuses.map((c) => [
                                            c.name,
                                            c
                                        ])
                                    );
                                    map.set(modal.status.name, modal.status);
                                    this.plugin.data.statuses = Array.from(
                                        map.values()
                                    );
                                }
                            }
                            await this.plugin.saveSettings();
                            this._displayStatuses(additionalContainer);
                        };
                        modal.open();
                    })
                )
                .addExtraButton((b) =>
                    b.setIcon("trash").onClick(async () => {
                        this.plugin.data.statuses =
                            this.plugin.data.statuses.filter(
                                (s) => s.name != status.name
                            );
                        if (this.plugin.data.unconsciousId == status.id) {
                            this.plugin.data.unconsciousId = "Unconscious";
                        }
                        await this.plugin.saveSettings();
                        this._displayStatuses(additionalContainer);
                    })
                )
                .setClass("initiative-status-item");
        }
    }
    private async _displayIntegrations(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        containerEl.ontoggle = () => {
            this.plugin.data.openState.plugin = containerEl.open;
        };
        const summary = containerEl.createEl("summary");
        new Setting(summary).setHeading().setName("Интеграции с плагинами");
        summary.createDiv("collapser").createDiv("handle");
        if (!this.plugin.canUseStatBlocks) {
            this.plugin.data.sync = false;
            await this.plugin.saveSettings();
        }
        new Setting(containerEl)
            .setName("Синхронизировать монстров из Fantasy Statblocks")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Самодельные существа, сохранённые в плагине Fantasy Statblocks, будут доступны для использования."
                    });
                    if (!this.plugin.canUseStatBlocks) {
                        e.createEl("br");
                        e.createEl("br");
                        e.createSpan({
                            text: "Установите и включите плагин "
                        });
                        e.createEl("a", {
                            text: "Fantasy Statblocks",
                            href: "obsidian://show-plugin?id=obsidian-5e-statblocks"
                        });
                        e.createSpan({
                            text: ", чтобы использовать самодельных существ."
                        });
                    }
                })
            )
            .addToggle((t) => {
                t.setDisabled(!this.plugin.canUseStatBlocks).setValue(
                    this.plugin.data.sync
                );
                t.onChange(async (v) => {
                    this.plugin.data.sync = v;
                    await this.plugin.saveSettings();
                    this._displayIntegrations(containerEl);
                });
            });
        if (this.plugin.data.sync) {
            const synced = new Setting(containerEl).setDesc(
                `Синхронизировано существ: ${this.plugin.bestiary.length}.`
            );
            synced.settingEl.addClass("initiative-synced");
            setIcon(synced.nameEl, "check-in-circle");
            synced.nameEl.appendChild(createSpan({ text: "Синхронизировано" }));
        }

        new Setting(containerEl)
            .setName("Формула инициативы")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Формула, используемая при расчёте инициативы. Используйте "
                    });
                    e.createEl("code", { text: "%mod%" });
                    e.createSpan({
                        text: " как плейсхолдер модификатора."
                    });
                    if (!this.plugin.canUseDiceRoller) {
                        e.createEl("br");
                        e.createEl("br");
                        e.createSpan({
                            attr: {
                                style: `color: var(--text-error);`
                            },
                            text: "Требуется плагин "
                        });
                        e.createEl("a", {
                            text: "Dice Roller",
                            href: "https://github.com/valentine195/obsidian-dice-roller",
                            cls: "external-link"
                        });
                        e.createSpan({
                            attr: {
                                style: `color: var(--text-error);`
                            },
                            text: " для изменения."
                        });
                    }
                })
            )
            .addText((t) => {
                if (!this.plugin.canUseDiceRoller) {
                    t.setDisabled(true);
                    this.plugin.data.initiative = "1d20 + %mod%";
                }
                t.setValue(this.plugin.data.initiative);
                t.onChange((v) => {
                    this.plugin.data.initiative = v;
                });
                t.inputEl.onblur = async () => {
                    tracker.roll(this.plugin);
                    await this.plugin.saveSettings();
                };
            });
    }
}

class NewPlayerModal extends Modal {
    player: HomebrewCreature;
    saved: boolean;
    constructor(
        private plugin: InitiativeTracker,
        private original: HomebrewCreature = {}
    ) {
        super(plugin.app);
        this.player = { ...(original ?? {}) };
    }
    async display(load?: boolean) {
        let { contentEl } = this;

        contentEl.addClass("initiative-tracker-add-player-modal");

        contentEl.empty();

        let error = false;

        contentEl.createEl("h2", {
            text: this.original ? "Изменить игрока" : "Новый игрок"
        });

        new Setting(contentEl)
            .setName("Привязать к заметке")
            .setDesc("Связать игрока с заметкой в вашем хранилище.")
            .addText((t) => {
                t.setValue(this.player.note ?? "");

                let files = this.app.vault.getFiles();
                const modal = new FileInputSuggest(this.app, t, files);
                modal.onSelect(async ({ item: file }) => {
                    if (!file) return;
                    const metaData = this.app.metadataCache.getFileCache(file);

                    this.player.note = file.basename;
                    this.player.path = file.path;
                    this.player.name = file.basename;

                    if (!metaData || !metaData.frontmatter) return;
                    const { ac, hp, modifier, level, name } =
                        metaData.frontmatter;
                    this.player.name = name ?? this.player.name;
                    this.player.ac = parseInt(ac ?? this.player.ac, 10);
                    this.player.hp = parseInt(hp ?? this.player.hp, 10);
                    this.player.level = parseInt(
                        level ?? this.player.level,
                        10
                    );
                    this.player.modifier = parseInt(
                        modifier ?? this.player.modifier,
                        10
                    );
                    this.player["statblock-link"] =
                        metaData.frontmatter["statblock-link"];
                    this.display();
                });
            });

        let nameInput: InputValidate,
            levelInput: InputValidate,
            hpInput: InputValidate,
            modInput: InputValidate;

        new Setting(contentEl)
            .setName("Имя")
            .setDesc("Имя игрока. Должно быть уникальным!")
            .addText((t) => {
                nameInput = {
                    input: t.inputEl,
                    validate: (i: HTMLInputElement) => {
                        let error = false;
                        if (
                            (!i.value.length && !load) ||
                            (this.plugin.players.has(i.value) &&
                                this.player.name != this.original.name)
                        ) {
                            i.addClass("has-error");
                            error = true;
                        }
                        return error;
                    }
                };
                t.setValue(this.player.name ?? "");
                t.onChange((v) => {
                    t.inputEl.removeClass("has-error");
                    this.player.name = v;
                });
            });
        new Setting(contentEl)
            .setName("Уровень")
            .setDesc("Уровень игрока.")
            .addText((t) => {
                levelInput = {
                    input: t.inputEl,
                    validate: (i: HTMLInputElement) => {
                        let error = false;
                        if (isNaN(Number(i.value)) || Number(i.value) <= 0) {
                            i.addClass("has-error");
                            error = true;
                        }
                        return error;
                    }
                };
                t.setValue(`${this.player.level ?? ""}`);
                t.onChange((v) => {
                    t.inputEl.removeClass("has-error");
                    this.player.level = Number(v);
                });
            });
        new Setting(contentEl).setName("Максимум хитов").addText((t) => {
            hpInput = {
                input: t.inputEl,
                validate: (i: HTMLInputElement) => {
                    let error = false;
                    if (isNaN(Number(i.value))) {
                        i.addClass("has-error");
                        error = true;
                    }
                    return error;
                }
            };
            t.setValue(`${this.player.hp ?? ""}`);
            t.onChange((v) => {
                t.inputEl.removeClass("has-error");
                this.player.hp = Number(v);
            });
        });
        new Setting(contentEl).setName("Класс доспеха").addText((t) => {
            t.setValue(`${this.player.ac ?? ""}`);
            t.onChange((v) => {
                this.player.ac = v;
            });
        });
        new Setting(contentEl)
            .setName("Модификатор инициативы")
            .setDesc("Будет прибавляться к случайно брошенной инициативе.")
            .addText((t) => {
                modInput = {
                    input: t.inputEl,
                    validate: (i) => {
                        let error = false;
                        if (isNaN(Number(i.value))) {
                            t.inputEl.addClass("has-error");
                            error = true;
                        }
                        return error;
                    }
                };
                t.setValue(`${this.player.modifier ?? ""}`);
                t.onChange((v) => {
                    this.player.modifier = Number(v);
                });
            });

        let footerEl = contentEl.createDiv();
        let footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => {
            b.setTooltip("Сохранить")
                .setIcon("checkmark")
                .onClick(async () => {
                    let error = this.validateInputs(
                        nameInput,
                        hpInput,
                        modInput
                    );
                    if (error) {
                        new Notice("Исправьте ошибки перед сохранением.");
                        return;
                    }
                    this.saved = true;
                    this.close();
                });
            return b;
        });
        footerButtons.addExtraButton((b) => {
            b.setIcon("cross")
                .setTooltip("Отмена")
                .onClick(() => {
                    this.saved = false;
                    this.close();
                });
            return b;
        });

        this.validateInputs(nameInput, hpInput, modInput);
    }
    validateInputs(...inputs: InputValidate[]) {
        let error = false;
        for (let input of inputs) {
            if (input.validate(input.input)) {
                error = true;
            } else {
                input.input.removeClass("has-error");
            }
        }
        return error;
    }
    onOpen() {
        this.display(true);
    }
}

import { App, ButtonComponent, Modal } from "obsidian";
import { tracker } from "src/tracker/stores/tracker";
import { getId } from "src/utils/creature";

export async function confirmWithModal(
    app: App,
    text: string,
    buttons: { cta: string; secondary: string } = {
        cta: "Да",
        secondary: "Нет"
    }
): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const modal = new ConfirmModal(app, text, buttons);
        modal.onClose = () => {
            resolve(modal.confirmed);
        };
        modal.open();
    });
}

export class ConfirmModal extends Modal {
    constructor(
        app: App,
        public text: string,
        public buttons: { cta: string; secondary: string }
    ) {
        super(app);
    }
    confirmed: boolean = false;
    async display() {
        new Promise((resolve) => {
            this.contentEl.empty();
            this.contentEl.addClass("confirm-modal");
            this.contentEl.createEl("p", {
                text: this.text
            });
            const buttonEl = this.contentEl.createDiv(
                "fantasy-calendar-confirm-buttons"
            );
            new ButtonComponent(buttonEl)
                .setButtonText(this.buttons.cta)
                .setCta()
                .onClick(() => {
                    this.confirmed = true;
                    this.close();
                });
            new ButtonComponent(buttonEl)
                .setButtonText(this.buttons.secondary)
                .onClick(() => {
                    this.close();
                });
        });
    }
    onOpen() {
        this.display();
    }
}
addIcon(
    "initiative-tracker-warning",
    `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="exclamation-triangle" class="svg-inline--fa fa-exclamation-triangle fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"></path></svg>`
);

class StatusModal extends Modal {
    status: Condition = { name: null, description: null, id: getId() };
    canceled = false;
    editing: boolean = false;
    original: string;
    constructor(public plugin: InitiativeTracker, status?: Condition) {
        super(plugin.app);
        if (status) {
            this.editing = true;
            this.original = status.name;
            this.status = {
                name: status.name,
                description: status.description,
                id: status.id ?? getId()
            };
        }
    }
    warned = false;
    onOpen() {
        this.titleEl.setText(this.editing ? "Изменить состояние" : "Новое состояние");
        this.contentEl.empty();
        const name = new Setting(this.contentEl)
            .setName("Имя")
            .addText((t) => {
                t.setValue(this.status.name).onChange((v) => {
                    this.status.name = v;
                    if (
                        this.plugin.data.statuses.find(
                            (s) => s.name == this.status.name
                        ) &&
                        !this.warned &&
                        this.original != this.status.name
                    ) {
                        this.warned = true;
                        name.setDesc(
                            createFragment((e) => {
                                const container = e.createDiv(
                                    "initiative-tracker-warning"
                                );
                                setIcon(
                                    container,
                                    "initiative-tracker-warning"
                                );
                                container.createSpan({
                                    text: "Состояние с таким именем уже существует и будет перезаписано."
                                });
                            })
                        );
                    } else if (this.warned) {
                        this.warned = false;
                        name.setDesc("");
                    }
                });
            });
        new Setting(this.contentEl).setName("Описание").addTextArea((t) => {
            t.setValue(this.status.description).onChange(
                (v) => (this.status.description = v)
            );
        });
        new Setting(this.contentEl)
            .setName("Удалять каждый раунд")
            .setDesc(
                "Это состояние будет снято со всех существ в начале нового раунда."
            )
            .addToggle((t) =>
                t
                    .setValue(this.status.resetOnRound)
                    .onChange((v) => (this.status.resetOnRound = v))
            );
        new Setting(this.contentEl)
            .setName("Имеет количество")
            .setDesc(
                "Это состояние имеет количество, которое можно увеличивать или уменьшать во время боя."
            )
            .addToggle((t) =>
                t.setValue(this.status.hasAmount).onChange((v) => {
                    this.status.hasAmount = v;
                    this.onOpen();
                })
            );
        if (this.status.hasAmount) {
            new Setting(this.contentEl)
                .setName("Начальное количество")
                .setDesc("При добавлении состояние получит это количество по умолчанию.")
                .addText(
                    (t) =>
                        (t
                            .setValue(`${this.status.startingAmount}`)
                            .onChange((v) => {
                                this.status.amount =
                                    this.status.startingAmount = Number(v);
                            }).inputEl.type = "number")
                );
        }

        new ButtonComponent(
            this.contentEl.createDiv("initiative-tracker-cancel")
        )
            .setButtonText("Отмена")
            .onClick(() => {
                this.canceled = true;
                this.close();
            });
    }
}

class PartyModal extends Modal {
    party: Party = { name: null, players: [] };
    canceled = false;
    editing = false;
    warned = false;
    original: string;
    constructor(public plugin: InitiativeTracker, party?: Party) {
        super(plugin.app);
        if (party) {
            this.editing = true;
            this.original = party.name;
            this.party = {
                name: party.name,
                players: [...(party.players ?? [])]
            };
        }
    }
    onOpen(): void {
        this.titleEl.setText(
            this.editing ? `Изменить ${this.party.name ?? "Отряд"}` : "Новый отряд"
        );

        const name = new Setting(this.contentEl)
            .setName("Имя")
            .addText((t) => {
                t.setValue(this.party.name).onChange((v) => {
                    this.party.name = v;
                    if (
                        this.plugin.data.parties.find(
                            (s) => s.name == this.party.name
                        ) &&
                        !this.warned &&
                        this.original != this.party.name
                    ) {
                        this.warned = true;
                        name.setDesc(
                            createFragment((e) => {
                                const container = e.createDiv(
                                    "initiative-tracker-warning"
                                );
                                setIcon(
                                    container,
                                    "initiative-tracker-warning"
                                );
                                container.createSpan({
                                    text: "Отряд с таким именем уже существует и будет перезаписан."
                                });
                            })
                        );
                    } else if (this.warned) {
                        this.warned = false;
                        name.setDesc("");
                    }
                });
            });

        const playersEl = this.contentEl.createDiv(
            "initiative-tracker-additional-container"
        );
        let playerText: TextComponent;
        new Setting(playersEl)
            .setName("Добавить игрока в отряд")
            .addText((t) => {
                playerText = t;
                const modal = new PlayerSuggestionModal(this.plugin.app, t, [
                    ...this.plugin.players.values()
                ]).onSelect(({ item }) => {
                    t.setValue(item.name);
                    modal.close();
                });
            })
            .addExtraButton((b) =>
                b.setIcon("plus-with-circle").onClick(() => {
                    if (!playerText.getValue() || !playerText.getValue().length)
                        return;
                    if (this.party.players.includes(playerText.getValue())) {
                        new Notice("Этот игрок уже состоит в отряде!");
                        return;
                    }
                    if (!this.plugin.players.has(playerText.getValue())) {
                        new Notice(
                            "Такого игрока не существует! Сначала создайте его."
                        );
                        return;
                    }
                    this.party.players.push(playerText.getValue());
                    this.displayPlayers(playersDisplayEl);
                    playerText.setValue("");
                })
            );
        const playersDisplayEl = playersEl.createDiv("additional");
        this.displayPlayers(playersDisplayEl);

        new ButtonComponent(
            this.contentEl.createDiv("initiative-tracker-cancel")
        )
            .setButtonText("Отмена")
            .onClick(() => {
                this.canceled = true;
                this.close();
            });
    }
    displayPlayers(containerEl: HTMLDivElement) {
        containerEl.empty();
        if (this.party.players.length) {
            for (const player of this.party.players) {
                new Setting(containerEl).setName(player).addExtraButton((b) => {
                    b.setIcon("trash").onClick(() => {
                        this.party.players.splice(
                            this.party.players.indexOf(player),
                            1
                        );
                        this.displayPlayers(containerEl);
                    });
                });
            }
        } else {
            containerEl
                .createDiv({
                    attr: {
                        style: "display: flex; justify-content: center; padding-bottom: 18px;"
                    }
                })
                .createSpan({
                    text: "Добавьте игрока в отряд, чтобы увидеть его здесь."
                });
        }
    }
}
