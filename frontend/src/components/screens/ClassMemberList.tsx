import { useState } from 'react';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import ClickableItemTable from '@/components/global/table/ItemClickable';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';
import type { Dependente } from '@/contracts/user';
import { displayUserValue } from '@/function/date';

type ClassMemberListProps = {
  label: string;
  columns: readonly ResponsiveColumn[];
  members: Dependente[];
  destinationRoute: string;
  emptyMessage: string;
  filteredMessage: string;
  helperMessage: string;
  includeStatus?: boolean;
};

function ClassMemberList({
  label,
  columns,
  members,
  destinationRoute,
  emptyMessage,
  filteredMessage,
  helperMessage,
  includeStatus = false,
}: ClassMemberListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const itemsPerPage = 7;
  const filteredMembers = members.filter((member) =>
    member.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedMembers = isAscending
    ? [...filteredMembers]
    : [...filteredMembers].reverse();
  const currentPageMembers = sortedMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <section
      aria-label={label}
      className='mt-8 mb-4 flex min-h-96 w-full min-w-0 flex-col items-center rounded-xl border border-borderMy bg-surface p-4 shadow-sm sm:p-6'
    >
      <div className='mt-2 flex w-full min-w-0 flex-wrap items-center justify-between gap-3'>
        <div className='w-full min-w-0 md:w-2/4'>
          <SearchInput
            name='search'
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            value={searchTerm}
          />
        </div>
        <div className='flex w-full min-w-0 justify-between md:w-2/4'>
          <div className='flex w-1/2 items-center justify-evenly'>
            <TopDown
              onClick={() => setIsAscending((ascending) => !ascending)}
              top={isAscending}
            />
          </div>
          <div className='flex w-1/2 items-center justify-between rounded-md border border-borderMy bg-surface-muted px-4 font-inter-medium text-sm text-clt-2'>
            <p>TOTAL:</p>
            <p>{currentPageMembers.length}</p>
          </div>
        </div>
      </div>
      <ResponsiveTable label={label} columns={columns}>
        <HeaderTable />
        <div className='flex min-h-72 w-full flex-col items-center justify-center'>
          <div className='w-full min-w-0'>
            {currentPageMembers.length === 0 ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-3 font-inter-regular text-clt-1'>
                <div
                  aria-hidden='true'
                  className='h-1 w-12 rounded-full bg-borderMy'
                />
                <p className='text-center text-lg'>
                  {sortedMembers.length === 0 ? emptyMessage : filteredMessage}
                </p>
                {sortedMembers.length === 0 ? (
                  <p className='text-center text-sm text-clt-1'>
                    {helperMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              currentPageMembers.map((member, index) => (
                <ClickableItemTable
                  key={member.id}
                  data={[
                    member.nomeCompleto,
                    member.email,
                    displayUserValue(member.instituicao),
                    displayUserValue(member.curso),
                    ...(includeStatus ? [member.status] : []),
                  ]}
                  rowIndex={index}
                  id={member.id}
                  destinationRoute={destinationRoute}
                />
              ))
            )}
          </div>
          {currentPageMembers.length > 0 && sortedMembers.length > 0 ? (
            <div className='mt-auto'>
              <Pagination
                totalItems={sortedMembers.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          ) : null}
        </div>
      </ResponsiveTable>
    </section>
  );
}

export default ClassMemberList;
