type InfoItem = {
  title: string;
  value: string;
  width: string; // Exemplo: '1/5', '2/5', etc.
};

type InfoContainerProps = {
  items: InfoItem[];
};

function InfoContainer({ items }: InfoContainerProps) {
  return (
    <div className='w-full h-20 rounded-md border border-borderMy flex items-center justify-between p-4'>
      {items.map((item, index) => (
        <div
          key={index}
          className={`h-full flex justify-evenly flex-col w-${item.width}`}
        >
          <p className='font-inter-regular text-clt-1 text-sm'>{item.title}</p>
          <p className='font-inter-medium text-clt-2 text-ellipsis text-nowrap overflow-hidden whitespace-nowrap'>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default InfoContainer;
