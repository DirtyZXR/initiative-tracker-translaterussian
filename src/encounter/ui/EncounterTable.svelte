<script lang="ts">
    import type InitiativeTracker from "src/main";

    import type { ParsedParams } from "..";
    import EncounterRow from "./EncounterRow.svelte";
    import { setContext } from "svelte";

    export let encounters: ParsedParams[];
    export let plugin: InitiativeTracker;

    setContext("plugin", plugin);

    const headers: string[] = [];
    if (
        encounters.some(
            (encounter) =>
                !encounter.hide.includes("players") &&
                ((typeof encounter.players == "boolean" && encounter.players) ||
                    (encounter.players instanceof Array &&
                        encounter.players.length))
        )
    )
        headers.push("players");
    if (
        encounters.some(
            (encounter) =>
                !encounter.hide.includes("creatures") &&
                encounter.creatures.size
        )
    )
        headers.push("creatures");
</script>

<table class="initiative-tracker encounter-table">
    <thead>
        <tr>
            <th>Имя</th>
            {#if headers.includes("creatures")}
                <th>Существа</th>
            {/if}
            {#if headers.includes("players")}
                <th>Игроки</th>
            {/if}
            {#if plugin.data.displayDifficulty}
                <th>Сложность</th>
            {/if}
            <th>Запуск</th>
        </tr>
    </thead>
    <tbody>
        {#each encounters as encounter}
            <EncounterRow {...encounter} {headers} {plugin} />
        {/each}
    </tbody>
</table>

<style>
</style>
