<script lang="ts">
    import {
        ExtraButtonComponent,
        type MenuItem,
        Platform,
        Menu
    } from "obsidian";
    import {
        BACKWARD,
        DICE,
        EXPAND,
        FORWARD,
        GROUP,
        NEW,
        PLAY,
        REDO,
        RollPlayerInitiativeBehavior,
        SAVE,
        STOP
    } from "src/utils";
    import { createEventDispatcher, getContext } from "svelte";
    import type InitiativeTracker from "src/main";
    import { tracker } from "../stores/tracker";

    const { state, data, logFile, sort, party } = tracker;

    const desktop = Platform.isDesktop;

    const playButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setIcon(PLAY)
            .setTooltip("Старт")
            .onClick(() => tracker.setState(true));
    };
    const stopButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setIcon(STOP)
            .setTooltip("Стоп")
            .onClick(() => tracker.setState(false));
    };
    const nextButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setIcon(FORWARD)
            .setTooltip("Дальше")
            .onClick(() => tracker.goToNext());
    };
    const prevButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setIcon(BACKWARD)
            .setTooltip("Назад")
            .onClick(() => tracker.goToPrevious());
    };

    const plugin = getContext<InitiativeTracker>("plugin");

    const dispatch = createEventDispatcher();

    const open = (evt: MouseEvent) => {
        const menu = new Menu();
        menu.addItem((item) => {
            item.setIcon(NEW)
                .setTitle("Новое столкновение")
                .onClick(() => tracker.new(plugin));
        });
        menu.addItem((item) => {
            item.setIcon(NEW)
                .setTitle("Добавить существ")
                .onClick(() => dispatch("add-creatures"));
        });
        menu.addItem((item) => {
            item.setIcon(REDO)
                .setTitle("Сбросить хиты / состояния")
                .onClick(() => tracker.reset());
        });
        menu.addItem((item) => {
            item.setIcon(DICE)
                .setTitle("Перебросить инициативу")
                .onClick(() => tracker.roll(plugin));
        });
        menu.addItem((item) => {
            item.setIcon(GROUP)
                .setTitle(
                    plugin.data.condense
                        ? "Развернуть существ"
                        : "Сгруппировать существ"
                )
                .onClick(async () => {
                    plugin.data.condense = !plugin.data.condense;
                    await plugin.saveSettings();
                    item.setIcon(plugin.data.condense ? EXPAND : GROUP);
                    item.setTitle(
                        plugin.data.condense
                            ? "Развернуть существ"
                            : "Сгруппировать существ"
                    );
                });
        });
        menu.addItem((item) => {
            item.setTitle($sort ? "По возрастанию" : "По убыванию").onClick(
                async () => {
                    plugin.data.descending = !plugin.data.descending;
                    await plugin.saveSettings();
                    item.setTitle(
                        plugin.data.descending
                            ? "По возрастанию"
                            : "По убыванию"
                    );
                }
            );
        });
        menu.addSeparator();

        if ($data.parties && $data.parties.length) {
            if (Platform.isMobile) {
                menu.addItem((item) => {
                    /* const partyMenu =  */ item.setIcon("switch")
                        .setTitle("Сменить отряд")
                        .setIsLabel(true);
                });
                menu.addItem((item) => {
                    item.setTitle("Нет")
                        .onClick(() => {
                            tracker.setParty("", plugin);
                        })
                        .setChecked(!$party || $party == "");
                });
                for (const p of $data.parties) {
                    menu.addItem((item) => {
                        item.setTitle(p.name)
                            .onClick(() => {
                                tracker.setParty(p.name, plugin);
                            })
                            .setChecked($party == p.name);
                    });
                }
            } else {
                menu.addItem((item) => {
                    const partyMenu = item
                        .setIcon("switch")
                        .setTitle("Сменить отряд")
                        .setSubmenu();
                    partyMenu.addItem((item) => {
                        item.setTitle("Нет")
                            .onClick(() => {
                                tracker.setParty("", plugin);
                            })
                            .setChecked(!$party || $party == "");
                    });
                    for (const p of $data.parties) {
                        partyMenu.addItem((item) => {
                            item.setTitle(p.name)
                                .onClick(() => {
                                    tracker.setParty(p.name, plugin);
                                })
                                .setChecked($party == p.name);
                        });
                    }
                });
            }
        }
        if (Platform.isMobile) {
            menu.addItem((item) => {
                item.setIcon("dice")
                    .setTitle("Бросок инициативы отряда")
                    .setIsLabel(true);
            });
            menu.addItem((item) => {
                item.setTitle("Всегда бросать")
                    .onClick(async () => {
                        plugin.data.rollPlayerInitiatives =
                            RollPlayerInitiativeBehavior.Always;
                        await plugin.saveSettings();
                    })
                    .setChecked(
                        plugin.data.rollPlayerInitiatives ==
                            RollPlayerInitiativeBehavior.Always
                    );
            });
            menu.addItem((item) => {
                item.setTitle("Никогда не бросать")
                    .onClick(async () => {
                        plugin.data.rollPlayerInitiatives =
                            RollPlayerInitiativeBehavior.Never;
                        await plugin.saveSettings();
                    })
                    .setChecked(
                        plugin.data.rollPlayerInitiatives ==
                            RollPlayerInitiativeBehavior.Never
                    );
            });
            menu.addItem((item) => {
                item.setTitle("Ставить ноль")
                    .onClick(async () => {
                        plugin.data.rollPlayerInitiatives =
                            RollPlayerInitiativeBehavior.SetToZero;
                        await plugin.saveSettings();
                    })
                    .setChecked(
                        plugin.data.rollPlayerInitiatives ==
                            RollPlayerInitiativeBehavior.SetToZero
                    );
            });
        } else {
            menu.addItem((item) => {
                const partyMenu = item
                    .setIcon("dice")
                    .setTitle("Бросок инициативы отряда")
                    .setSubmenu();

                partyMenu.addItem((item) => {
                    item.setTitle("Всегда бросать")
                        .onClick(async () => {
                            plugin.data.rollPlayerInitiatives =
                                RollPlayerInitiativeBehavior.Always;
                            await plugin.saveSettings();
                        })
                        .setChecked(
                            plugin.data.rollPlayerInitiatives ==
                                RollPlayerInitiativeBehavior.Always
                        );
                });
                partyMenu.addItem((item) => {
                    item.setTitle("Никогда не бросать")
                        .onClick(async () => {
                            plugin.data.rollPlayerInitiatives =
                                RollPlayerInitiativeBehavior.Never;
                            await plugin.saveSettings();
                        })
                        .setChecked(
                            plugin.data.rollPlayerInitiatives ==
                                RollPlayerInitiativeBehavior.Never
                        );
                });
                partyMenu.addItem((item) => {
                    item.setTitle("Ставить ноль")
                        .onClick(async () => {
                            plugin.data.rollPlayerInitiatives =
                                RollPlayerInitiativeBehavior.SetToZero;
                            await plugin.saveSettings();
                        })
                        .setChecked(
                            plugin.data.rollPlayerInitiatives ==
                                RollPlayerInitiativeBehavior.SetToZero
                        );
                });
            });
        }

        menu.addSeparator();
        if (!Platform.isMobile) {
            menu.addItem((item) => {
                const load = item
                    .setIcon("open-elsewhere-glyph")
                    .setTitle("Загрузить столкновение")
                    .setDisabled(
                        Object.keys(plugin.data.encounters).length == 0
                    )
                    .setSubmenu()
                    .setNoIcon();

                for (const encounter of Object.keys(plugin.data.encounters)) {
                    load.addItem((item) => {
                        item.setTitle(encounter).onClick(() => {
                            tracker.new(
                                plugin,
                                plugin.data.encounters[encounter]
                            );
                        });
                    });
                }
            });
        } else {
            menu.addItem((item) => {
                item.setIcon("open-elsewhere-glyph")
                    .setTitle("Загрузить столкновение")
                    .setIsLabel(true);
            });
            for (const encounter of Object.keys(plugin.data.encounters)) {
                menu.addItem((item) => {
                    item.setTitle(encounter).onClick(() => {
                        tracker.new(plugin, plugin.data.encounters[encounter]);
                    });
                });
            }
        }
        menu.addItem((item) => {
            item.setIcon(SAVE)
                .setTitle("Сохранить столкновение")
                .onClick(() => {
                    dispatch("save");
                });
        });

        menu.showAtMouseEvent(evt);
    };

    const menuIcon = (node: HTMLElement) => {
        new ExtraButtonComponent(node).setIcon("vertical-three-dots");
    };
    const playerView = (node: HTMLElement) => {
        new ExtraButtonComponent(node).setIcon("view");
    };
    const logFileButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node).setIcon("file-signature");
    };
    const openLogFile = async () => {
        if ($logFile) {
            const leaf = plugin.app.workspace.getLeaf();
            leaf.openFile($logFile);
        }
    };
</script>

<div class="buttons">
    <div class="state">
        {#if $state}
            <div use:stopButton />
            <div use:prevButton />
            <div use:nextButton />
        {:else}
            <div use:playButton />
        {/if}
    </div>
    <div class="clean">
        {#if $logFile}
            <div
                use:logFileButton
                aria-label="Открыть файл журнала"
                on:click={openLogFile}
            />
        {/if}
        {#if desktop}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                use:playerView
                aria-label="Открыть экран игрока"
                on:click={(evt) => dispatch("player-view")}
            />
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div use:menuIcon on:click={(evt) => open(evt)} />
    </div>
</div>

<style>
    .buttons {
        display: flex;
        justify-content: space-between;
        padding: 0 0 0.5rem 0;
    }
    .state {
        display: flex;
        justify-content: flex-start;
        align-items: center;
    }
    .clean {
        display: flex;
        justify-content: flex-end;
        align-items: center;
    }

    .state > *:not(:last-child),
    .clean > *:not(:last-child) {
        margin-right: 0.25rem;
    }
</style>
