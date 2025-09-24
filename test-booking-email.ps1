# Test booking creation with PowerShell
Write-Output "Testing booking creation with email..."

$bookingData = @{
    username = "Test Customer"
    email = "preethijawaiy@gmail.com"
    phone = "+1234567890"
    notes = "Test booking for email functionality"
    date = "2025-09-25" 
    time = "10:00"
} | ConvertTo-Json

Write-Output "Booking data: $bookingData"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/booking/simple" -Method Post -Body $bookingData -ContentType "application/json"
    Write-Output "✅ Booking created successfully!"
    Write-Output "Response: $($response | ConvertTo-Json -Depth 3)"
    Write-Output ""
    Write-Output "📧 Check your email (preethijawaiy@gmail.com) for:"
    Write-Output "1. Customer confirmation email"
    Write-Output "2. Admin notification email"
} catch {
    Write-Error "❌ Booking creation failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorDetails = $reader.ReadToEnd()
        Write-Output "Error details: $errorDetails"
    }
}