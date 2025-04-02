namespace Core.Pagination
{
    public class ParametrosConsulta
    {
        const int tamanhoMaxPagina = 50;
        public int NumeroPagina { get; set; } = 1;
        private int _tamanhoPagina;

        public int TamanhoPagina
        {
            get
            {
                return _tamanhoPagina;
            }
            set
            {
                _tamanhoPagina = (value > tamanhoMaxPagina) ? tamanhoMaxPagina : value;
            }
        }
    }
}