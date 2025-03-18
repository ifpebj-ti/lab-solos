import { Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'fontPadrao',
  src: '../../../public/fonts/Rajdhani/Rajdhani-Medium.ttf', // Caminho da fonte dentro do projeto
});

const styles = StyleSheet.create({
  section: {
    marginBottom: 10,
  },
  text: {
    fontSize: 11,
    color: '#232323',
    marginTop: 13,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'fontPadrao',
  },
});

export const DescriptionPdf = () => (
  <View style={styles.section}>
    <Text style={styles.text}>
      Esse relatório foi gerado automaticamente pelo sistema. Os dados aqui
      contidos refletem o estado do sistema no momento da geração deste
      documento e podem estar sujeitos a alterações conforme novas atualizações
      sejam realizadas. Para mais informações ou esclarecimentos, consulte a
      administração do laboratório responsável.
    </Text>
  </View>
);
