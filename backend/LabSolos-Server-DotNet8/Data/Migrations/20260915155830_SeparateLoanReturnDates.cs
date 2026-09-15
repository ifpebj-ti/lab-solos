using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeparateLoanReturnDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DataPrevistaDevolucao",
                table: "Emprestimos",
                type: "timestamp with time zone",
                nullable: true);

            // The overloaded legacy value was the scheduled deadline: the old
            // endpoint could not complete a return while it was populated.
            migrationBuilder.Sql("""
                UPDATE "Emprestimos"
                SET "DataPrevistaDevolucao" = "DataDevolucao",
                    "DataDevolucao" = NULL
                WHERE "DataDevolucao" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Roll back to the legacy single-date contract. Preserve an
            // effective date when one exists; otherwise restore the deadline.
            migrationBuilder.Sql("""
                UPDATE "Emprestimos"
                SET "DataDevolucao" = COALESCE("DataDevolucao", "DataPrevistaDevolucao")
                WHERE "DataPrevistaDevolucao" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "DataPrevistaDevolucao",
                table: "Emprestimos");
        }
    }
}
