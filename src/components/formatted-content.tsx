import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { UI } from '@/components/exam-ui';

interface FormattedContentProps {
  content: string;
  style?: object;
  textStyle?: object;
}

// Convert common LaTeX math notation to readable Unicode and mathematical structures
function formatLatex(mathText: string): string {
  let text = mathText.trim();
  // Fractions: \frac{a}{b} -> (a / b)
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');
  // Square root: \sqrt{x} -> √(x)
  text = text.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  text = text.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, '√$1');
  // Superscripts: x^{2} -> x² or x^2
  text = text.replace(/\^\{([0-9a-zA-Z+-]+)\}/g, '^$1');
  text = text.replace(/\^2\b/g, '²');
  text = text.replace(/\^3\b/g, '³');
  text = text.replace(/\^([0-9])/g, (_, n) => ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'][Number(n)] || `^${n}`);
  // Subscripts: x_{1} -> x₁
  text = text.replace(/_\{([0-9a-zA-Z+-]+)\}/g, '_$1');
  text = text.replace(/_([0-9])/g, (_, n) => ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'][Number(n)] || `_${n}`);
  // Greek & Math Symbols
  const symbols: Record<string, string> = {
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\theta': 'θ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\pi': 'π',
    '\\sigma': 'σ',
    '\\omega': 'ω',
    '\\Delta': 'Δ',
    '\\Omega': 'Ω',
    '\\times': '×',
    '\\div': '÷',
    '\\pm': '±',
    '\\mp': '∓',
    '\\le': '≤',
    '\\leq': '≤',
    '\\ge': '≥',
    '\\geq': '≥',
    '\\neq': '≠',
    '\\approx': '≈',
    '\\infty': '∞',
    '\\int': '∫',
    '\\sum': '∑',
    '\\prod': '∏',
    '\\in': '∈',
    '\\notin': '∉',
    '\\subset': '⊂',
    '\\subseteq': '⊆',
    '\\cap': '∩',
    '\\cup': '∪',
    '\\rightarrow': '→',
    '\\leftarrow': '←',
    '\\Rightarrow': '⇒',
    '\\Leftarrow': '⇐',
    '\\circ': '°',
    '\\cdot': '·',
  };
  for (const [key, val] of Object.entries(symbols)) {
    text = text.replaceAll(key, val);
  }
  // Remove remaining backslashes
  text = text.replace(/\\([a-zA-Z]+)/g, '$1');
  return text;
}

export function FormattedContent({ content, style, textStyle }: FormattedContentProps) {
  if (!content) return null;

  // Check if content has markdown table
  const lines = content.split('\n');
  const blocks: { type: 'text' | 'table' | 'math'; data: string | string[][] }[] = [];
  let tableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      tableLines.push(line);
    } else {
      if (tableLines.length >= 2) {
        // Parse table
        const rows = tableLines
          .filter((l) => !/^\|[\s-:]+\|$/.test(l.replace(/\s+/g, ''))) // Filter separator row like |---|---|
          .map((l) =>
            l
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim()),
          );
        blocks.push({ type: 'table', data: rows });
        tableLines = [];
      } else if (tableLines.length > 0) {
        // Not a valid table, push as text
        blocks.push({ type: 'text', data: tableLines.join('\n') });
        tableLines = [];
      }
      if (line.length > 0) {
        blocks.push({ type: 'text', data: lines[i] });
      }
    }
  }

  if (tableLines.length >= 2) {
    const rows = tableLines
      .filter((l) => !/^\|[\s-:]+\|$/.test(l.replace(/\s+/g, '')))
      .map((l) =>
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim()),
      );
    blocks.push({ type: 'table', data: rows });
  } else if (tableLines.length > 0) {
    blocks.push({ type: 'text', data: tableLines.join('\n') });
  }

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, index) => {
        if (block.type === 'table') {
          const rows = block.data as string[][];
          if (!rows.length) return null;
          const header = rows[0];
          const dataRows = rows.slice(1);
          return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} key={`table-${index}`} style={styles.tableScroll}>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  {header.map((col, colIdx) => (
                    <View key={`th-${colIdx}`} style={styles.thCell}>
                      <Text style={styles.thText}>{formatLatex(col)}</Text>
                    </View>
                  ))}
                </View>
                {dataRows.map((row, rowIdx) => (
                  <View key={`tr-${rowIdx}`} style={[styles.tableRow, rowIdx % 2 === 1 && styles.tableRowAlt]}>
                    {row.map((cell, cellIdx) => (
                      <View key={`td-${cellIdx}`} style={styles.tdCell}>
                        <Text style={styles.tdText}>{formatLatex(cell)}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }

        // Parse inline math ($...$)
        const rawText = block.data as string;
        const segments: { isMath: boolean; text: string }[] = [];
        const parts = rawText.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
        for (const part of parts) {
          if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('$') && part.endsWith('$'))) {
            const math = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1);
            segments.push({ isMath: true, text: formatLatex(math) });
          } else if (part.length > 0) {
            segments.push({ isMath: false, text: part });
          }
        }

        return (
          <Text key={`p-${index}`} style={[styles.paragraph, textStyle]}>
            {segments.map((seg, segIdx) => (
              <Text key={`seg-${segIdx}`} style={seg.isMath ? styles.mathText : undefined}>
                {seg.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  paragraph: {
    color: UI.ink,
    fontSize: 16,
    lineHeight: 25,
  },
  mathText: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#0A3B8C',
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  tableScroll: {
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.line,
  },
  table: {
    minWidth: 320,
    backgroundColor: UI.surface,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#EDF2FB',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD7E8',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: UI.line,
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  thCell: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#CBD7E8',
    justifyContent: 'center',
  },
  tdCell: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: UI.line,
    justifyContent: 'center',
  },
  thText: {
    color: UI.ink,
    fontWeight: '800',
    fontSize: 13,
  },
  tdText: {
    color: UI.ink,
    fontSize: 13,
    lineHeight: 18,
  },
});
