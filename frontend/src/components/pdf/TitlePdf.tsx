import { View, StyleSheet, Text } from '@react-pdf/renderer';
import { ReactNode } from 'react';

interface UnderlinedTextProps {
  children: ReactNode;
}
const styles = StyleSheet.create({
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 10,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#232323',
    textTransform: 'uppercase',
  },
  underline: {
    height: 1, // Espessura da linha
    backgroundColor: '#b5b5b5', // Cor do sublinhado
    marginTop: 1, // Espaçamento entre o texto e a linha
    alignSelf: 'center', // Evita ocupar a largura total
  },
});

export const TitlePdf: React.FC<UnderlinedTextProps> = ({ children }) => {
  const textContent = String(children); // Garantir que seja tratado como string
  return (
    <View style={styles.textContainer}>
      <Text style={styles.text}>{textContent}</Text>
      {/* Linha ajustada automaticamente ao texto */}
      <View
        style={[styles.underline, { width: `${textContent.length * 7}px` }]}
      />
    </View>
  );
};
