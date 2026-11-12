require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'WebViewBackgroundPlugin'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://github.com/anthropics/orgnote'
  s.author = 'OrgNote Team'
  s.source = { :git => 'https://github.com/anthropics/orgnote.git', :tag => s.version.to_s }
  s.source_files = 'Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.swift_version = '5.1'
  s.dependency 'Capacitor'
end
