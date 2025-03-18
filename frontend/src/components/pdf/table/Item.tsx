import { View, Text, StyleSheet } from '@react-pdf/renderer';

type ITableItem = {
  data: string[]; // Array de valores para cada coluna
  rowIndex: number;
  columnWidths: string[]; // Larguras dinâmicas das colunas
};

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  text: {
    fontSize: 10,
    color: '#232323',
    textAlign: 'left',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
});

export const ItemTablePdf = ({ data, rowIndex, columnWidths }: ITableItem) => {
  // Alternância de cor para linhas pares e ímpares
  const backgroundColor = rowIndex % 2 === 0 ? '#f4f4f5' : '#e5e7eb'; // Cores similares às do Tailwind

  return (
    <View style={[styles.row, { backgroundColor }]}>
      {data.map((value, index) => (
        <Text key={index} style={[styles.text, { width: columnWidths[index] }]}>
          {value}
        </Text>
      ))}
    </View>
  );
};
