<template>
  <div class="codeflask">
    <pre ref="prism" class="codeflask__prism"/>

    <textarea
      ref="input"
      class="codeflask__text-input"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      @click="hideWelcome"
      @input="highlight"
      @scroll="scroll"
      @keydown.enter="addLineNumber"
      @keydown.delete="deleteLineNumber"
      @keydown.tab="insertTab"
      @paste="recalculateLineNumbers"
      @keydown.ctrl.90="recalculateLineNumbers"
    />

    <ul ref="lineNumbers" class="codeflask__line-numbers"/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { mapState, Module } from "vuex";
import { FRIENDLY_LANGUAGES } from "@/assets/languages";
import prism from "prismjs";

interface ScrollEvent extends MouseEvent {
  target: HTMLUListElement | HTMLPreElement;
}

@Component({
  computed: {
    ...mapState("editor", ["LANGUAGE", "LINE_NUMBERS", "TAB_SIZE", "styles"])
  }
})
export default class CodeFlask extends Vue {
  public $refs!: {
    [key: string]: any;

    prism: HTMLPreElement;
    input: HTMLTextAreaElement;
    lineNumbers: HTMLUListElement;
  };

  private LANGUAGE!: string;
  private LINE_NUMBERS!: boolean;
  private TAB_SIZE!: number;
  private styles!: { [key: string]: any };

  private welcomeIsDisplayed: boolean = true;

  public async mounted(): Promise<void> {
    await this.displayWelcome();

    this.applyStyles();
    this.recalculateLineNumbers();
    this.highlight();
  }

  private highlight(): void {
    this.$refs.prism.innerHTML = prism.highlight(this.$refs.input.value, prism.languages[this.LANGUAGE], prism.languages[this.LANGUAGE]);
  }

  private scroll(event: ScrollEvent): void {
    this.$refs.lineNumbers.style.transform = `translateY(-${event.target.scrollTop}px)`;
    this.$refs.prism.style.transform = `translate(-${event.target.scrollLeft}px, -${event.target.scrollTop}px)`;
  }

  private addLineNumber(): void {
    const li: HTMLLIElement = document.createElement("li");

    li.style.backgroundColor = "inherit";
    li.innerText = String(this.$refs.lineNumbers.childElementCount + 1);

    this.$refs.lineNumbers.appendChild(li);
  }

  private deleteLineNumber(): void {
    setTimeout(
      (): void => {
        // Get the number of lines it should have by splitting every new line and counting it
        const linesLeft: number = this.$refs.input.value.split("\n").length;

        // Keep deleting the last child (the last line number) until it meets the number of lines it should have after deletion
        while (this.$refs.lineNumbers.children.length > linesLeft) {
          const lastChild = this.$refs.lineNumbers.lastChild;
          if (lastChild) this.$refs.lineNumbers.removeChild(lastChild);
        }
      }
    );
  }

  private recalculateLineNumbers(): void {
    setTimeout(
      (): void => {
        const currentLines: number = this.$refs.lineNumbers.childElementCount; // Get the current number of lines
        const totalLines: number = this.$refs.input.value.split("\n").length;

        for (let i: number = currentLines + 1; i < totalLines + 1; i++) this.addLineNumber();
      }
    );
  }

  private insertText(text: string): void {
    const start: number = this.$refs.input.selectionStart;
    const end: number = this.$refs.input.selectionEnd;

    this.$refs.input.value = this.$refs.input.value.slice(0, start) + text + this.$refs.input.value.slice(end);
    this.$refs.input.selectionEnd = start + text.length;
  }

  private insertTab(event: KeyboardEvent): void {
    event.preventDefault();

    this.insertText(" ".repeat(this.TAB_SIZE));
    this.highlight();
  }

  private applyStyles(): void {
    for (const reference in this.styles) {
      for (const styleName in this.styles[reference]) {
        this.$refs[reference].style[styleName] = this.styles[reference][styleName];
      }
    }
  }

  private async displayWelcome(): Promise<void> {
    let message: string = "";

    try {
      const desiredWelcome: string = await import(`@/assets/welcome/${this.LANGUAGE}`).then(module => module.default);
      message += desiredWelcome.trim();
    } catch (error) {
      // If example doesn't exist for that language, construct a markdown as placeholder
      try {
        message += await this.createWelcomeFallback();
        this.$store.dispatch("editor/changeSetting", { key: "LANGUAGE", value: "markdown" });
      } catch (err) {
        console.error(err);
      }
    }

    message.trim();
    message += "\n\n";
    message += `\`The current language is set to ${FRIENDLY_LANGUAGES[this.LANGUAGE]}!\``;

    this.$refs.input.value = message;
  }

  private hideWelcome(): void {
    if (!this.welcomeIsDisplayed) return;

    this.$refs.input.value = "";

    while (this.$refs.prism.firstChild) {
      this.$refs.prism.removeChild(this.$refs.prism.firstChild);
      this.deleteLineNumber();
    }

    this.welcomeIsDisplayed = false;
  }

  private async createWelcomeFallback(): Promise<string> {
    try {
      const fileName: string = "BASE"; // Workaround for IDE error not able to find module...
      const BASE: {
        introduction: string;
        paste: string;
        upload: string;
      } = await import(`@/assets/welcome/${fileName}`);

      const introduction: string = `# INTRODUCTION\n\n${BASE.introduction}`;
      const paste: string = `# HOW TO UPLOAD PASTES\n\n${BASE.paste}`;
      const upload: string = `# HOW TO UPLOAD FILES\n\n${BASE.upload}`;

      return Promise.resolve([introduction, paste, upload].join("\n\n"));
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@/assets/colors.scss";

$font-size: 16px;
$line-height: 8px; // How much space between each line
$line-numbers-width: 40px;
$margin-size: 25px; // How much space around the whole component

.codeflask {
  width: calc(100vw - #{$margin-size * 2});
  height: calc(100vh - #{$margin-size * 3});
  position: relative; // Anchor element for absolute positioning
  font-size: $font-size;
  font-family: "Fira Code", monospace;
  margin: 0 $margin-size;
  overflow: hidden;
}

.codeflask__line-numbers,
.codeflask__prism,
.codeflask__text-input {
  margin: 0;
  height: inherit;
  font-size: inherit;
  font-family: inherit;
  line-height: calc(#{$font-size} + #{$line-height});
}

.codeflask__prism,
.codeflask__text-input {
  width: calc(100vw - #{$line-numbers-width} - #{$margin-size * 2});
  position: absolute;
  margin-left: $line-numbers-width;
}

.codeflask__line-numbers {
  width: $line-numbers-width;
  position: absolute;
  background-color: color("background");
  color: lighten(color("background"), 50%);
  margin: 0;
  padding: 0;
  list-style-type: none;
}

.codeflask__text-input {
  background: none;
  color: transparent;
  caret-color: white;
  padding: 0;
  white-space: pre; // Preserve whitespace
  overflow: auto;
  outline: none;
  border: none;
  resize: none;
}

.codeflask__prism {
  color: lighten(color("background"), 75%);
}
</style>