interface CreateFormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function CreateFormActions({
  isSubmitting,
  onCancel,
}: CreateFormActionsProps) {
  return (
    <div className='flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end'>
      <button
        type='button'
        onClick={onCancel}
        disabled={isSubmitting}
        className='min-h-11 w-full rounded-md border border-primaryMy bg-surface px-4 font-rajdhani-semibold text-base text-primaryMy transition-colors hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-36'
      >
        Cancelar
      </button>
      <button
        type='submit'
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className='min-h-11 w-full rounded-md bg-primaryMy px-4 font-rajdhani-semibold text-base text-white transition-colors hover:bg-opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-36'
      >
        Adicionar
      </button>
    </div>
  );
}
