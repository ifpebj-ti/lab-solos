using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Migrations
{
    /// <inheritdoc />
    public partial class AddGrupoToQuimicos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "DataValidade", "UltimaModificacao" },
                values: new object[] { new DateTime(2025, 10, 9, 23, 34, 51, 336, DateTimeKind.Local).AddTicks(6955), new DateTime(2024, 10, 9, 23, 34, 51, 336, DateTimeKind.Local).AddTicks(7005) });

            migrationBuilder.UpdateData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "DataValidade", "UltimaModificacao" },
                values: new object[] { new DateTime(2026, 10, 9, 23, 34, 51, 336, DateTimeKind.Local).AddTicks(7224), new DateTime(2024, 10, 9, 23, 34, 51, 336, DateTimeKind.Local).AddTicks(7230) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "DataValidade", "UltimaModificacao" },
                values: new object[] { new DateTime(2025, 10, 9, 23, 12, 27, 790, DateTimeKind.Local).AddTicks(4557), new DateTime(2024, 10, 9, 23, 12, 27, 790, DateTimeKind.Local).AddTicks(4589) });

            migrationBuilder.UpdateData(
                table: "Produtos",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "DataValidade", "UltimaModificacao" },
                values: new object[] { new DateTime(2026, 10, 9, 23, 12, 27, 790, DateTimeKind.Local).AddTicks(4783), new DateTime(2024, 10, 9, 23, 12, 27, 790, DateTimeKind.Local).AddTicks(4791) });
        }
    }
}
