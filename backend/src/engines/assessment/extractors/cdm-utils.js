/**
 * CDM Query Utilities for Extractors
 */

function flattenSections(sections) {
  const flat = [];
  for (const s of sections) {
    flat.push(s);
    if (s.children) {
      flat.push(...flattenSections(s.children));
    }
  }
  return flat;
}

function findSection(cdm, id) {
  if (!cdm || !cdm.sections) return null;
  const flat = flattenSections(cdm.sections);
  return flat.find((s) => s.id === id) || null;
}

function findSectionByTitle(cdm, titleRegex) {
  if (!cdm || !cdm.sections) return null;
  const flat = flattenSections(cdm.sections);
  return flat.find((s) => titleRegex.test(s.title)) || null;
}

function formFieldsInSection(section) {
  if (!section || !section.blocks) return [];
  const fields = [];
  for (const block of section.blocks) {
    if (block.type === 'form' && block.fields) {
      fields.push(...block.fields);
    }
  }
  return fields;
}

function findFormValue(section, labelRegex) {
  const fields = formFieldsInSection(section);
  const found = fields.find((f) => labelRegex.test(f.label));
  return found ? found.value : null;
}

function findTablesInSection(section) {
  if (!section || !section.blocks) return [];
  return section.blocks.filter((b) => b.type === 'table');
}

function findPseudoTablesInSection(section) {
  if (!section || !section.blocks) return [];
  return section.blocks.filter((b) => b.type === 'pseudo-table');
}

function findFormValueAcrossDoc(cdm, labelRegex) {
  if (!cdm || !cdm.sections) return null;
  const flat = flattenSections(cdm.sections);
  for (const s of flat) {
    const val = findFormValue(s, labelRegex);
    if (val !== null) return val;
  }
  return null;
}

module.exports = {
  findSection,
  findSectionByTitle,
  formFieldsInSection,
  findFormValue,
  findFormValueAcrossDoc,
  findTablesInSection,
  findPseudoTablesInSection,
  flattenSections,
};
