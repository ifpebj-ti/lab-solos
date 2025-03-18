import { Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import logo from '../../../public/images/logoGreen.png';

// Create styles
const styles = StyleSheet.create({
  section: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  image: {
    width: 25,
    height: 25,
  },
  logoText: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 25,
    fontWeight: 500,
    color: '#16a34a',
    marginLeft: 10,
    marginTop: 6,
  },
});

// Create Document Component
export const HeaderPdf = () => (
  <View style={styles.section}>
    <View style={styles.logoText}>
      <Image src={logo} style={styles.image}></Image>
      <Text style={styles.titulo}>LabON</Text>
    </View>
  </View>
);
