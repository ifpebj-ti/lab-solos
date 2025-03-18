import { View, Text, StyleSheet, Font } from '@react-pdf/renderer';

type Column = {
  value: string;
  width: string;
};

type HeaderTableProps = {
  columns: Column[];
};

Font.register({
  family: 'fontPadrao',
  src: '../../../public/fonts/Rajdhani/Rajdhani-SemiBold.ttf', // Caminho da fonte dentro do projeto
});

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#474747',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  columnText: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'left', // Alinhamento do texto no PDF
    fontFamily: 'fontPadrao',
    fontWeight: 600,
  },
});

export const HeaderTablePdf = ({ columns }: HeaderTableProps) => (
  <View style={styles.headerContainer}>
    {columns.map((column, index) => (
      <Text key={index} style={[styles.columnText, { width: column.width }]}>
        {column.value}
      </Text>
    ))}
  </View>
);
