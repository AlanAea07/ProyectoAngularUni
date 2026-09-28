param([Parameter(Mandatory=$true)][string]$Docx, [Parameter(Mandatory=$true)][string]$Pdf)
$ErrorActionPreference = 'Stop'
$InputDocument = (Resolve-Path -LiteralPath $Docx).Path
$OutputPdf = [System.IO.Path]::GetFullPath($Pdf)
$WordRenderer = $null
$ReadOnlyDocument = $null
try {
    # Conversión de archivo con la API de Word; no modifica el DOCX ni documentos abiertos.
    $WordRenderer = New-Object -ComObject Word.Application
    $WordRenderer.Visible = $false
    $WordRenderer.DisplayAlerts = 0
    $ReadOnlyDocument = $WordRenderer.Documents.Open($InputDocument, $false, $true, $false)
    $ReadOnlyDocument.ExportAsFixedFormat($OutputPdf, 17)
    Write-Output $OutputPdf
} finally {
    if ($null -ne $ReadOnlyDocument) { $ReadOnlyDocument.Close(0); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ReadOnlyDocument) }
    if ($null -ne $WordRenderer) { $WordRenderer.Quit(0); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($WordRenderer) }
}
