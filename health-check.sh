#!/bin/bash
echo "🔍 Keyword Processor Health Check"
echo "================================="

# Check if web server is running
if pgrep apache2 > /dev/null || pgrep nginx > /dev/null || pgrep httpd > /dev/null; then
    echo "✅ Web server is running"
else
    echo "❌ Web server is not running"
fi

# Check if MySQL is running  
if pgrep mysql > /dev/null || pgrep mariadb > /dev/null; then
    echo "✅ Database server is running"
else
    echo "❌ Database server is not running"
fi

# Check key files exist
if [ -f "test-connection.php" ]; then
    echo "✅ Test files exist"
else
    echo "❌ Test files missing"
fi

# Check directory permissions
if [ -w "uploads" ]; then
    echo "✅ Upload directory writable"
else
    echo "❌ Upload directory not writable"
fi

if [ -f "api/config/database.php" ]; then
    echo "✅ Database config exists"
else
    echo "❌ Database config missing"
fi

echo "================================="
echo "🌐 Access dashboard: http://your-domain/keyword-processor/test-connection.php"
echo "🚀 Main app: http://your-domain/keyword-processor/"
