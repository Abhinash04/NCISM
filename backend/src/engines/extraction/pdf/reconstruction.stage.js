const fs = require('fs');
const path = require('path');

class ReconstructionService {

    /**
     * Reconstructs the Markdown from the input JSON, merging key-value pairs.
     * @param {string} jsonPath - Path to input.json
     * @param {string} mdPath - Path to output input.md
     */
    reconstruct(jsonPath, mdPath) {
        if (!fs.existsSync(jsonPath)) {
            console.warn(`[ReconstructionService] JSON not found at ${jsonPath}`);
            return false;
        }

        try {
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (!data.kids || !Array.isArray(data.kids)) {
                return false; // Invalid format
            }

            // Process kids per page
            const pages = {};
            data.kids.forEach(kid => {
                const pageNum = kid['page number'] || 1;
                if (!pages[pageNum]) pages[pageNum] = [];
                pages[pageNum].push(kid);
            });

            let markdownOutput = '';

            for (const pageNum of Object.keys(pages).sort((a, b) => parseInt(a) - parseInt(b))) {
                const pageElements = pages[pageNum];
                const reconstructed = this.processPage(pageElements);
                
                reconstructed.forEach(element => {
                    markdownOutput += this.generateMarkdown(element) + '\n\n';
                });
            }

            // Write back the reconstructed markdown
            fs.writeFileSync(mdPath, markdownOutput.trim() + '\n', 'utf8');
            console.log(`[ReconstructionService] Successfully reconstructed markdown at ${mdPath}`);
            return true;

        } catch (err) {
            console.error('[ReconstructionService] Error during reconstruction:', err);
            return false;
        }
    }

    processPage(elements) {
        let result = [];
        let currentGroup = [];
        let textElementCount = 0;

        for (const el of elements) {
            if (el.type === 'paragraph' || el.type === 'heading') {
                currentGroup.push(el);
                textElementCount++;
            } else {
                if (currentGroup.length > 0) {
                    result = result.concat(this.detectKeyValues(currentGroup));
                    currentGroup = [];
                }
                result.push(el);
            }
        }

        if (currentGroup.length > 0) {
            result = result.concat(this.detectKeyValues(currentGroup));
        }

        console.log(`[ReconstructionService] Processed page with ${textElementCount} text elements.`);
        return result;
    }

    detectKeyValues(elements) {
        const sorted = [...elements].sort((a, b) => {
            const aTop = Math.max(a['bounding box'][1], a['bounding box'][3]);
            const bTop = Math.max(b['bounding box'][1], b['bounding box'][3]);
            
            if (Math.abs(aTop - bTop) > 10) {
                return bTop - aTop;
            }
            return a['bounding box'][0] - b['bounding box'][0];
        });

        const reconstructed = [];
        let i = 0;
        let detectedLabels = 0;
        let matchedPairs = 0;

        while (i < sorted.length) {
            const el = sorted[i];
            const text = (el.content || '').trim();
            const isLabel = text.endsWith(':') && el['bounding box'] && el['bounding box'][0] < 300;

            if (isLabel) {
                detectedLabels++;
                console.log(`[ReconstructionService] Detected label: "${text}" at X=${el['bounding box'][0]}`);
                let key = text.replace(/:$/, '').trim();
                let values = [];
                
                let j = i + 1;
                while (j < sorted.length) {
                    const nextEl = sorted[j];
                    const nextText = (nextEl.content || '').trim();
                    const isNextLabel = nextText.endsWith(':') && nextEl['bounding box'] && nextEl['bounding box'][0] < 300;
                    
                    if (isNextLabel) {
                        break;
                    }

                    if (nextEl['bounding box'] && el['bounding box'] && nextEl['bounding box'][0] < el['bounding box'][0] + 20 && !isNextLabel) {
                        break;
                    }

                    values.push(nextText);
                    j++;
                }

                if (values.length > 0) {
                    matchedPairs++;
                    reconstructed.push({
                        type: 'key_value',
                        key: key,
                        value: values.join('\n'),
                        originalElements: sorted.slice(i, j)
                    });
                    i = j;
                    continue;
                }
            }
            
            reconstructed.push(el);
            i++;
        }

        if (detectedLabels > 0) {
            console.log(`[ReconstructionService] Matched ${matchedPairs} key-value pairs out of ${detectedLabels} candidate labels in this block.`);
        }

        // Group consecutive key_value elements into a form block
        const finalResult = [];
        let formGroup = [];

        for (const item of reconstructed) {
            if (item.type === 'key_value') {
                formGroup.push(item);
            } else {
                if (formGroup.length > 0) {
                    finalResult.push({ type: 'form_block', fields: formGroup });
                    formGroup = [];
                }
                finalResult.push(item);
            }
        }
        if (formGroup.length > 0) {
            finalResult.push({ type: 'form_block', fields: formGroup });
        }

        return finalResult;
    }

    generateMarkdown(element) {
        if (!element) return '';

        switch (element.type) {
            case 'form_block':
                return this.generateFormBlockMarkdown(element.fields);
            case 'key_value':
                // Standalone key value (shouldn't happen usually)
                return `**${element.key}:**\n${element.value}`;
            case 'heading':
                const level = element['heading level'] || 1;
                return `${'#'.repeat(level)} ${element.content}`;
            case 'paragraph':
                return element.content;
            case 'list':
                return this.generateListMarkdown(element);
            case 'table':
                return this.generateTableMarkdown(element);
            default:
                if (element.content) return element.content;
                return '';
        }
    }

    generateFormBlockMarkdown(fields) {
        // Decide whether to use table or bolded list based on heuristics
        let useTable = true;
        const charThreshold = 100;

        for (const field of fields) {
            if (field.value.includes('\n') || field.value.length > charThreshold) {
                useTable = false;
                break;
            }
        }

        if (useTable) {
            let md = '| Field | Value |\n|---|---|\n';
            for (const field of fields) {
                // Escape pipes for markdown tables
                const safeKey = field.key.replace(/\|/g, '\\|');
                const safeValue = field.value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
                md += `| ${safeKey} | ${safeValue} |\n`;
            }
            return md;
        } else {
            let md = '';
            for (const field of fields) {
                md += `**${field.key}:**\n${field.value}\n\n`;
            }
            return md.trim();
        }
    }

    generateListMarkdown(listElement) {
        let md = '';
        if (listElement['list items']) {
            listElement['list items'].forEach(item => {
                let prefix = listElement['numbering style'] === 'arabic numbers' ? '1. ' : '- ';
                let itemContent = item.content || '';
                
                if (item.kids) {
                    item.kids.forEach(kid => {
                        itemContent += '\n' + this.generateMarkdown(kid);
                    });
                }
                md += `${prefix}${itemContent.trim()}\n`;
            });
        }
        return md.trim();
    }

    generateTableMarkdown(tableElement) {
        // Fallback to HTML table to support colspans and rowspans
        let html = '<table>\n';
        if (tableElement.rows) {
            tableElement.rows.forEach(row => {
                html += '  <tr>\n';
                if (row.cells) {
                    row.cells.forEach(cell => {
                        const colspan = cell['column span'] > 1 ? ` colspan="${cell['column span']}"` : '';
                        const rowspan = cell['row span'] > 1 ? ` rowspan="${cell['row span']}"` : '';
                        const tag = cell.pdfua_tag === 'TH' ? 'th' : 'td';
                        
                        let cellContent = '';
                        if (cell.kids) {
                            cell.kids.forEach(kid => {
                                cellContent += this.generateMarkdown(kid) + '<br>';
                            });
                        }
                        
                        // Clean up trailing <br>
                        cellContent = cellContent.replace(/(<br>)+$/, '').trim();
                        html += `    <${tag}${colspan}${rowspan}>${cellContent}</${tag}>\n`;
                    });
                }
                html += '  </tr>\n';
            });
        }
        html += '</table>';
        return html;
    }
}

module.exports = new ReconstructionService();
