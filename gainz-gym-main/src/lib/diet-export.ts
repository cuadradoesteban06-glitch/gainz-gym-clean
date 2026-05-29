import type { DietPlan } from "./diet.functions";

const GOAL_LABELS: Record<string, string> = {
  fat_loss: "Bajar grasa",
  muscle_gain: "Ganar masa muscular",
  maintain: "Mantener peso",
  performance: "Mejorar rendimiento",
  recomposition: "Recomposición corporal",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDietHtml(diet: DietPlan): string {
  const mealsHtml = diet.meals
    .map(
      (meal) => `
      <section class="meal">
        <h3>${escapeHtml(meal.name)}${meal.time ? ` <span class="time">${escapeHtml(meal.time)}</span>` : ""}</h3>
        <ul>
          ${meal.items
            .map(
              (item) =>
                `<li><strong>${escapeHtml(item.quantity)}</strong> ${escapeHtml(item.food)}${item.notes ? ` <em>(${escapeHtml(item.notes)})</em>` : ""}</li>`
            )
            .join("")}
        </ul>
      </section>`
    )
    .join("");

  const shoppingHtml =
    diet.shopping_list.length > 0
      ? `<section><h2>Lista de compras</h2><ul>${diet.shopping_list.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul></section>`
      : "";

  const replacementsHtml =
    diet.replacements.length > 0
      ? `<section><h2>Reemplazos aplicados</h2>${diet.replacements
          .map(
            (r) =>
              `<p><strong>${escapeHtml(r.missing)}</strong> → ${escapeHtml(r.substitute)}<br/><small>${escapeHtml(r.explanation)}</small></p>`
          )
          .join("")}</section>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(diet.title)} — GainZ</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #111; max-width: 720px; margin: 0 auto; padding: 32px 24px; line-height: 1.5; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
    .macros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .macro { border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; }
    .macro .val { font-size: 20px; font-weight: 700; }
    .macro .lbl { font-size: 11px; text-transform: uppercase; color: #666; }
    h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    h3 { font-size: 14px; margin: 0 0 8px; }
    .time { font-weight: 400; color: #666; font-size: 13px; }
    .meal { margin-bottom: 16px; page-break-inside: avoid; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 4px; }
    .reasoning { background: #f7f7f7; padding: 12px; border-radius: 8px; font-size: 14px; }
    footer { margin-top: 32px; font-size: 11px; color: #888; text-align: center; }
    @media print {
      body { padding: 16px; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(diet.title)}</h1>
  <p class="meta">${escapeHtml(GOAL_LABELS[diet.goal] ?? diet.goal)} · ${new Date(diet.created_at).toLocaleDateString("es-AR")} · GainZ Gym</p>
  <div class="macros">
    <div class="macro"><div class="val">${diet.calories}</div><div class="lbl">kcal/día</div></div>
    <div class="macro"><div class="val">${diet.protein_g}g</div><div class="lbl">Proteína</div></div>
    <div class="macro"><div class="val">${diet.carbs_g}g</div><div class="lbl">Carbos</div></div>
    <div class="macro"><div class="val">${diet.fat_g}g</div><div class="lbl">Grasas</div></div>
  </div>
  ${diet.reasoning ? `<section><h2>Enfoque</h2><p class="reasoning">${escapeHtml(diet.reasoning)}</p></section>` : ""}
  <h2>Comidas</h2>
  ${mealsHtml}
  ${shoppingHtml}
  ${replacementsHtml}
  <footer>Generado con GainZ · Plan nutricional personalizado</footer>
</body>
</html>`;
}

/** Opens browser print dialog — user can save as PDF */
export function exportDietToPdf(diet: DietPlan): void {
  const html = buildDietHtml(diet);
  const win = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!win) {
    alert("Permití ventanas emergentes para exportar el PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 350);
}
