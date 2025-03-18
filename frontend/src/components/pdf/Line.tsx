import { View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  section: {
    paddingLeft: 10,
    paddingRight: 10,
    width: '100%',
    height: 1,
    backgroundColor: '#b5b5b5',
  },
});

export const LinePdf = () => <View style={styles.section}></View>;
