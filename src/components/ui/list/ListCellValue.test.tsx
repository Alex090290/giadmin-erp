import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ListCellValue from "./ListCellValue";
import type { ListColumn } from "@/lib/list/types";

const column: ListColumn = {field:"state",label:"Estado",widget:"badge",options:[{value:"draft",label:"Borrador"}],colors:{draft:"warning"}};
const render = (state: string | null, config = column) => renderToStaticMarkup(<ListCellValue record={{id:"test",state}} column={config} />);

test("shared collection cells render the Selection label and color without changing its value", () => {
  const html = render("draft");
  assert.match(html, /badge-warning/);
  assert.match(html, />Borrador<\/span>/);
  assert.doesNotMatch(html, />draft</);
});
test("missing, unmapped and unknown badge values use neutral and escape their text", () => {
  assert.match(render("draft", {...column,colors:{}}), /badge-neutral.*>Borrador<\/span>/);
  assert.match(render(null), /badge-neutral.*>—<\/span>/);
  const html = render("<script>");
  assert.match(html, /badge-neutral/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
test("plain selections keep their existing text presentation", () => {
  assert.equal(render("draft", {...column,widget:undefined,colors:undefined}), "Borrador");
});

test("colors without a widget style Selection text and leave unmapped values unchanged", () => {
  const textColumn = {...column,widget:undefined};
  assert.equal(render("draft", textColumn), '<span class="text-warning">Borrador</span>');
  assert.equal(render("draft", {...textColumn,colors:{}}), "Borrador");
  assert.equal(render(null, textColumn), "—");
  assert.equal(render("<script>", textColumn), "&lt;script&gt;");
});
