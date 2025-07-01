import SearchMaterialComponent from '@/components/screens/SearchMaterialComponent';

function SearchMaterial() {
  return (
    <SearchMaterialComponent
      userType='admin'
      destinationRoute='/admin/verification'
    />
  );
}

export default SearchMaterial;
