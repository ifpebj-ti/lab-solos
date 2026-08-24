resource "oci_resource_scheduler_schedule" "start_labon" {
  compartment_id     = oci_identity_compartment.labon.id
  action             = "START_RESOURCE"
  display_name       = "labon-start-0700"
  description        = "Liga a VM de producao do LabOn diariamente as 07:00 America/Sao_Paulo (10:00 UTC)."
  recurrence_type    = "CRON"
  recurrence_details = "0 10 * * *"

  resources {
    id = oci_core_instance.labon.id
  }
}

resource "oci_resource_scheduler_schedule" "stop_labon" {
  compartment_id     = oci_identity_compartment.labon.id
  action             = "STOP_RESOURCE"
  display_name       = "labon-stop-2300"
  description        = "Desliga a VM de producao do LabOn diariamente as 23:00 America/Sao_Paulo (02:00 UTC)."
  recurrence_type    = "CRON"
  recurrence_details = "0 2 * * *"

  resources {
    id = oci_core_instance.labon.id
  }
}

resource "oci_identity_policy" "resource_scheduler" {
  compartment_id = var.tenancy_ocid
  name           = "labon-resource-scheduler"
  description    = "Permite somente as agendas do LabOn iniciar e parar sua VM."

  statements = [
    "Allow any-user to manage instance in compartment id ${oci_identity_compartment.labon.id} where all {request.principal.type='resourceschedule', request.principal.id='${oci_resource_scheduler_schedule.start_labon.id}'}",
    "Allow any-user to manage instance in compartment id ${oci_identity_compartment.labon.id} where all {request.principal.type='resourceschedule', request.principal.id='${oci_resource_scheduler_schedule.stop_labon.id}'}",
  ]
}
