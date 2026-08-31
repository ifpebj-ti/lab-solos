using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class UserDataContracts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Usuarios"
                ALTER COLUMN "DataIngresso" TYPE date
                USING ("DataIngresso" AT TIME ZONE 'UTC')::date;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // O horário original foi descartado no Up. Backup pré-migração é a
            // única forma de recuperá-lo; o Down reconstrói meia-noite UTC.
            migrationBuilder.Sql(
                """
                ALTER TABLE "Usuarios"
                ALTER COLUMN "DataIngresso" TYPE timestamp with time zone
                USING ("DataIngresso"::timestamp AT TIME ZONE 'UTC');
                """);
        }
    }
}
