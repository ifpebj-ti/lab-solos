type InfoItem = {
  title: string;
  value: string | number | null;
  width: string;
};

type InfoContainerProps = {
  items: InfoItem[];
};

function InfoContainer({ items }: InfoContainerProps) {
  return (
    <div className='w-full lg:w-[49%] h-20 rounded-md shadow-sm bg-white flex items-center justify-between p-4'>
      {items.map((item, index) => (
        <div
          key={index}
          className={`h-full flex justify-evenly flex-col`}
          style={{ width: item.width }}
        >
          <p className='font-inter-regular text-clt-1 text-sm line-clamp-1'>
            {item.title}
          </p>
          <p className='font-inter-medium text-clt-2 text-ellipsis text-nowrap overflow-hidden whitespace-nowrap'>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default InfoContainer;
