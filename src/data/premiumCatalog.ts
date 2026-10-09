import type { TemplateCategory } from "./templateCatalog";
import { CATEGORY_INFO } from "./templateCatalog";
export interface PremiumDescriptor {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  preview: string;
  supportsPhoto: boolean;
}
const editions = ["Studio", "Signature", "Architect", "Contour"];
export const PREMIUM_CATALOG: PremiumDescriptor[] = Object.keys(
  CATEGORY_INFO,
).flatMap((category) =>
  editions.map((edition, index) => ({
    id: `premium_${category.toLowerCase()}_${index + 1}`,
    name: `${CATEGORY_INFO[category as TemplateCategory].label.split(" & ")[0]} ${edition}`,
    category: category as TemplateCategory,
    description: [
      "A tailored editorial grid with a professional masthead.",
      "A portrait-ready credential column and refined serif typography.",
      "An organised timeline with numbered evidence sections.",
      "A compact two-column profile with strong section hierarchy.",
    ][index],
    supportsPhoto: index === 1,
    preview: `premium/${category.toLowerCase()}_${index + 1}.png`,
  })),
);
