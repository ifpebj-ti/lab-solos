import { Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'fontPadrao',
  src: '../../../public/fonts/Rajdhani/Rajdhani-Medium.ttf', // Caminho da fonte dentro do projeto
});

const styles = StyleSheet.create({
  unique: {
    width: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    marginTop: 85,
  },
  line: {
    width: '90%',
    height: 1.5,
    backgroundColor: '#b5b5b5',
    marginBottom: 10,
  },
  text: {
    fontSize: 11,
    color: '#232323',
    textAlign: 'center',
    fontFamily: 'fontPadrao',
  },
});

export const ToSign = () => (
  <View style={styles.unique}>
    <View style={styles.line}></View>
    <Text style={styles.text}>Rosemberg Teixeira</Text>
  </View>
);
