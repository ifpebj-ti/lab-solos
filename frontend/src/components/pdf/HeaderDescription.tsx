import { Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  section: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titulo: {
    fontSize: 14,
    fontWeight: 600,
    color: '#232323',
    marginTop: 13,
    marginBottom: 10,
  },
  dataText: {
    fontSize: 11,
    fontWeight: 500,
    color: '#232323',
  },
});

// Create Document Component
export const HeaderDescription = () => (
  <View style={styles.section}>
    <Text style={styles.titulo}>
      Laboratórios de Solos e Sustentabilidade Ambiental - IFPE
    </Text>
    <Text style={styles.dataText}>
      Rosemberg Vasconcelos de Sousa - Administrador
    </Text>
    <Text style={styles.dataText}>15/05/2024 - N° 25586</Text>
  </View>
);
