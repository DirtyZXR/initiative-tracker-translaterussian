import { type TableHeaderState, SortFunctions } from "src/builder/builder.types";
import { Modal, Setting, TextAreaComponent } from "obsidian";
import { EditorView } from "@codemirror/view";
import { editorFromTextArea } from "../../../utils/editor/index";

export class EditModal extends Modal {
    public header: TableHeaderState;
    public editing: boolean;
    editor: EditorView;
    public canceled = false;
    onOpen() {
        this.titleEl.setText(this.editing ? "Изменить заголовок" : "Создать заголовок");
        this.display();
    }
    display() {
        this.contentEl.empty();
        new Setting(this.contentEl).setName("Отображаемый текст").addText((t) =>
            t.setValue(this.header.text).onChange((v) => {
                this.header.text = v;
            })
        );
        new Setting(this.contentEl)
            .setName("Связанное свойство")
            .addText((t) =>
                t
                    .setValue(this.header.field)
                    .onChange((v) => (this.header.field = v))
            );
        new Setting(this.contentEl)
            .setName("Тип сортировки")
            .setDesc(
                "Определяет, как сортируется поле. Используйте тип, соответствующий типу данных поля."
            )
            .addDropdown((t) => {
                t.addOption(`${SortFunctions.LOCAL_COMPARE}`, "Строка");
                t.addOption(`${SortFunctions.CONVERT_FRACTION}`, "Число");
                t.addOption(`${SortFunctions.CUSTOM}`, "Пользовательский");
                t.setValue(`${this.header.type}`).onChange((v) => {
                    this.header.type = Number(v);
                    if (this.header.type == SortFunctions.CUSTOM) {
                        this.header.func = ``;
                    } else {
                        delete this.header.func;
                    }
                    this.display();
                });
            });
        if ("func" in this.header) {
            new Setting(this.contentEl)
                .setName("Пользовательская функция сортировки")
                .setDesc(
                    createFragment((e) => {
                        e.createSpan({
                            text: "Задайте собственную JavaScript-функцию сортировки."
                        });
                        e.createEl("br");
                        e.createEl("br");

                        e.createSpan({
                            text: "Эта функция получает два объекта монстров, "
                        });
                        e.createEl("code", { text: "a" });
                        e.createSpan({ text: " и " });
                        e.createEl("code", { text: "b" });
                        e.createSpan({
                            text: ", и должна возвращать число. Это число определяет порядок сортировки."
                        });
                    })
                );
            const component = new TextAreaComponent(this.contentEl).setValue(
                this.header.func!
            );
            component.inputEl.addClass("initiative-tracker-textarea");
            this.editor = editorFromTextArea(
                component.inputEl,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        this.header.func = update.state.doc.toString();
                    }
                })
            );
        }
        new Setting(this.contentEl).addButton((b) => {
            b.setButtonText("Отмена")
                .setCta()
                .onClick(() => {
                    this.canceled = true;
                    this.close();
                });
        });
    }
    close() {
        this.editor?.destroy();
        super.close();
    }
}
