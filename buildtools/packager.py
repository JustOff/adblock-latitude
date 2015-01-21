# coding: utf-8

# This Source Code is subject to the terms of the Mozilla Public License
# version 2.0 (the "License"). You can obtain a copy of the License at
# http://mozilla.org/MPL/2.0/.

import os, sys, re, subprocess, jinja2, buildtools, codecs, hashlib, base64, shutil
from ConfigParser import SafeConfigParser
from StringIO import StringIO
from zipfile import ZipFile, ZIP_STORED, ZIP_DEFLATED
import buildtools.localeTools as localeTools

KNOWN_APPS = {
  'conkeror':   '{a79fe89b-6662-4ff4-8e88-09950ad4dfde}',
  'emusic':     'dlm@emusic.com',
  'fennec':     '{a23983c0-fd0e-11dc-95ff-0800200c9a66}',
  'firefox':    '{ec8030f7-c20a-464f-9b0e-13a3a9e97384}',
  'midbrowser':   '{aa5ca914-c309-495d-91cf-3141bbb04115}',
  'prism':    'prism@developer.mozilla.org',
  'seamonkey':  '{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}',
  'songbird':   'songbird@songbirdnest.com',
  'thunderbird':  '{3550f703-e582-4d05-9a08-453d09bdfdc6}',
  'toolkit':    'toolkit@mozilla.org',
  'palemoon':    '{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}',
}

defaultLocale = 'en-US'

def getDefaultFileName(baseDir, metadata, version, ext='xpi'):
  return os.path.join(baseDir, '%s-%s.%s' % (metadata.get('general', 'baseName'), version, ext))

def getMetadataPath(baseDir):
  return os.path.join(baseDir, 'metadata')

def getChromeDir(baseDir):
  return os.path.join(baseDir, 'chrome')

def getLocalesDir(baseDir):
  return os.path.join(getChromeDir(baseDir), 'locale')

def getChromeSubdirs(baseDir, locales):
  result = {}
  chromeDir = getChromeDir(baseDir)
  for subdir in ('content', 'skin'):
    result[subdir] = os.path.join(chromeDir, subdir)
  for locale in locales:
    result['locale/%s' % locale] = os.path.join(chromeDir, 'locale', locale)
  return result

def getXPIFiles(baseDir):
  return [os.path.join(baseDir, file) for file in ('components', 'modules', 'defaults', 'bootstrap.js', 'chrome.manifest', 'icon.png', 'icon64.png')]

def getTestEnvFiles(baseDir):
  return [os.path.join(baseDir, file) for file in ('components', 'defaults', 'bootstrap.js', 'chrome.manifest', 'icon.png', 'icon64.png')]

def getIgnoredFiles(params):
  result = ['.incomplete']
  if not params['limitMetadata']:
    result.append('meta.properties')
  if params['releaseBuild']:
    result.append('TimeLine.jsm')
  return result

def isValidLocale(localesDir, dir, includeIncomplete=False):
  if re.search(r'[^\w\-]', dir):
    return False
  if not os.path.isdir(os.path.join(localesDir, dir)):
    return False
  if not includeIncomplete and os.path.exists(os.path.join(localesDir, dir, '.incomplete')):
    return False
  return True

def getLocales(baseDir, includeIncomplete=False):
  global defaultLocale
  localesDir = getLocalesDir(baseDir)
  locales = filter(lambda dir:  isValidLocale(localesDir, dir, includeIncomplete), os.listdir(localesDir))
  locales.sort(key=lambda x: '!' if x == defaultLocale else x)
  return locales

def getBuildNum(baseDir):
  (result, dummy) = subprocess.Popen(['hg', 'id', '-n'], stdout=subprocess.PIPE).communicate()
  return re.sub(r'\W', '', result)

def readMetadata(baseDir):
  metadata = SafeConfigParser()
  file = codecs.open(getMetadataPath(baseDir), 'rb', encoding='utf-8')
  metadata.readfp(file)
  file.close()
  return metadata

def processFile(path, data, params):
  if not re.search(r'\.(manifest|xul|jsm?|xml|xhtml|rdf|dtd|properties|css)$', path):
    return data

  data = re.sub(r'\r', '', data)
  data = data.replace('{{BUILD}}', params['buildNum'])
  data = data.replace('{{VERSION}}', params['version'])

  whitespaceRegExp = re.compile(r'^(  )+', re.M)
  data = re.sub(whitespaceRegExp, lambda match: '\t' * (len(match.group(0)) / 2), data)

  if path.endswith('.manifest') and data.find('{{LOCALE}}') >= 0:
    localesRegExp = re.compile(r'^(.*?){{LOCALE}}(.*?){{LOCALE}}(.*)$', re.M)
    replacement = '\n'.join(map(lambda locale: r'\1%s\2%s\3' % (locale, locale), params['locales']))
    data = re.sub(localesRegExp, replacement, data)

  if params['releaseBuild'] and path.endswith('.jsm'):
    # Remove timeline calls from release builds
    timelineRegExp1 = re.compile(r'^.*\b[tT]imeLine\.(\w+)\(.*', re.M)
    timelineRegExp2 = re.compile(r'^.*Cu\.import\([^()]*\bTimeLine\.jsm\"\).*', re.M)
    data = re.sub(timelineRegExp1, '', data)
    data = re.sub(timelineRegExp2, '', data)

  return data

def readLocaleMetadata(baseDir, locales):
  result = {}

  # Make sure we always have fallback data even if the default locale isn't part
  # of the build
  locales = list(locales)
  if not defaultLocale in locales:
    locales.append(defaultLocale)

  for locale in locales:
    data = SafeConfigParser()
    try:
      result[locale] = localeTools.readFile(os.path.join(getLocalesDir(baseDir), locale, 'meta.properties'))
    except:
      result[locale] = {}
  return result

def getTranslators(localeMetadata):
  translators = {}
  for locale in localeMetadata.itervalues():
    if 'translator' in locale:
      for translator in locale['translator'].split(','):
        translator = translator.strip()
        if translator:
          translators[translator] = True
  result = translators.keys()
  result.sort()
  return result

def createManifest(baseDir, params):
  global KNOWN_APPS, defaultLocale
  env = jinja2.Environment(loader=jinja2.FileSystemLoader(buildtools.__path__[0]), autoescape=True, extensions=['jinja2.ext.autoescape'])
  env.filters['translators'] = getTranslators
  template = env.get_template('install.rdf.tmpl')
  templateData = dict(params)
  templateData['localeMetadata'] = readLocaleMetadata(baseDir, params['locales'])
  templateData['KNOWN_APPS'] = KNOWN_APPS
  templateData['defaultLocale'] = defaultLocale
  return template.render(templateData).encode('utf-8')

def readFile(files, params, path, name):
  ignoredFiles = getIgnoredFiles(params)
  if os.path.isdir(path):
    for file in os.listdir(path):
      if file in ignoredFiles:
        continue
      readFile(files, params, os.path.join(path, file), '%s/%s' % (name, file))
  else:
    file = open(path, 'rb')
    data = processFile(path, file.read(), params)
    file.close()
    files[name] = data

def fixupLocales(baseDir, files, params):
  global defaultLocale

  # Read in default locale data, it might not be included in files
  defaultLocaleDir = os.path.join(getLocalesDir(baseDir), defaultLocale)
  reference = {}
  ignoredFiles = getIgnoredFiles(params)
  for file in os.listdir(defaultLocaleDir):
    path = os.path.join(defaultLocaleDir, file)
    if file in ignoredFiles or not os.path.isfile(path):
      continue
    data = localeTools.readFile(path)
    if data:
      reference[file] = data

  for locale in params['locales']:
    for file in reference.iterkeys():
      path = 'locale/%s/%s' % (locale, file)
      if path in files:
        data = localeTools.parseString(files[path].decode('utf-8'), path)
        for key, value in reference[file].iteritems():
          if not key in data:
            files[path] += localeTools.generateStringEntry(key, value, path).encode('utf-8')
      else:
        files[path] = reference[file]['_origData'].encode('utf-8')

def createChromeJar(baseDir, params, files=None):
  if not files:
    files = {}
  for name, path in getChromeSubdirs(baseDir, params['locales']).iteritems():
    if os.path.isdir(path):
      readFile(files, params, path, name)
  if not params['limitMetadata']:
    fixupLocales(baseDir, files, params)

  data = StringIO()
  jar = ZipFile(data, 'w', ZIP_STORED)
  for name, value in files.iteritems():
    jar.writestr(name, value)
  jar.close()
  return data.getvalue()

def readXPIFiles(baseDir, params, files):
  for path in getXPIFiles(baseDir):
    if os.path.exists(path):
      readFile(files, params, path, os.path.basename(path))

def signFiles(files, keyFile):
  import M2Crypto
  manifest = []
  signature = []

  def getDigest(data):
    md5 = hashlib.md5()
    md5.update(data)
    sha1 = hashlib.sha1()
    sha1.update(data)
    return 'Digest-Algorithms: MD5 SHA1\nMD5-Digest: %s\nSHA1-Digest: %s\n' % (base64.b64encode(md5.digest()), base64.b64encode(sha1.digest()))

  def addSection(manifestData, signaturePrefix):
    manifest.append(manifestData)
    signatureData = ''
    if signaturePrefix:
      signatureData += signaturePrefix
    signatureData += getDigest(manifestData)
    signature.append(signatureData)

  addSection('Manifest-Version: 1.0\n', 'Signature-Version: 1.0\n')
  fileNames = files.keys()
  fileNames.sort()
  for fileName in fileNames:
    addSection('Name: %s\n%s' % (fileName, getDigest(files[fileName])), 'Name: %s\n' % fileName)
  files['META-INF/manifest.mf'] = '\n'.join(manifest)
  files['META-INF/zigbert.sf'] = '\n'.join(signature)

  keyHandle = open(keyFile, 'rb')
  keyData = keyHandle.read()
  keyHandle.close()
  stack = M2Crypto.X509.X509_Stack()
  first = True
  for match in re.finditer(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', keyData, re.S):
    if first:
      # Skip first certificate
      first = False
    else:
      stack.push(M2Crypto.X509.load_cert_string(match.group(0)))

  mime = M2Crypto.SMIME.SMIME()
  mime.load_key(keyFile)
  mime.set_x509_stack(stack)
  signature = mime.sign(M2Crypto.BIO.MemoryBuffer(files['META-INF/zigbert.sf'].encode('utf-8')), M2Crypto.SMIME.PKCS7_DETACHED | M2Crypto.SMIME.PKCS7_BINARY)

  buffer = M2Crypto.BIO.MemoryBuffer()
  signature.write_der(buffer)
  files['META-INF/zigbert.rsa'] = buffer.read()

def writeXPI(files, outFile):
  zip = ZipFile(outFile, 'w', ZIP_DEFLATED)
  names = files.keys()
  names.sort(key=lambda x: '!' if x == 'META-INF/zigbert.rsa' else x)
  for name in names:
    zip.writestr(name, files[name])
  zip.close()

def createBuild(baseDir, outFile=None, locales=None, buildNum=None, releaseBuild=False, keyFile=None, limitMetadata=False):
  if buildNum == None:
    buildNum = getBuildNum(baseDir)
  if locales == None:
    locales = getLocales(baseDir)
  elif locales == 'all':
    locales = getLocales(baseDir, True)

  metadata = readMetadata(baseDir)
  version = metadata.get('general', 'version')
#  if not releaseBuild:
#    version += '.' + buildNum

  if limitMetadata:
    for option in metadata.options('compat'):
      if not option in ('firefox', 'thunderbird', 'seamonkey'):
        metadata.remove_option('compat', option)

  if outFile == None:
    outFile = getDefaultFileName(baseDir, metadata, version)

  params = {
    'locales': locales,
    'releaseBuild': releaseBuild,
    'buildNum': buildNum,
    'version': version.encode('utf-8'),
    'metadata': metadata,
    'limitMetadata': limitMetadata,
  }
  files = {}
  files['install.rdf'] = createManifest(baseDir, params)
  if metadata.has_option('general', 'nojar'):
    readFile(files, params, os.path.join(baseDir, 'chrome'), 'chrome')
  else:
    files['chrome/%s.jar' % metadata.get('general', 'baseName')] = createChromeJar(baseDir, params)
  readXPIFiles(baseDir, params, files)
  if keyFile:
    signFiles(files, keyFile)
  writeXPI(files, outFile)

def setupTestEnvironment(baseDir, profileDirs):
  metadata = readMetadata(baseDir)
  params = {
    'locales': getLocales(baseDir, True),
    'releaseBuild': True,
    'buildNum': '',
    'version': '99.9',
    'metadata': metadata,
    'limitMetadata': False,
  }
  files = {}
  files['install.rdf'] = createManifest(baseDir, params)
  for path in getTestEnvFiles(baseDir):
    if os.path.exists(path):
      readFile(files, params, path, os.path.basename(path))

  if 'chrome.manifest' in files:
    # Redirect manifest entries to the current directory
    if sys.platform == 'win32':
      import nturl2path
      baseURL = 'file:' + nturl2path.pathname2url(os.path.abspath(baseDir))
    else:
      import urllib
      baseURL = 'file://' + urllib.quote(os.path.abspath(baseDir))
    files['chrome.manifest'] = re.sub(r'\bjar:chrome/\w+\.jar!', '%s/chrome' % baseURL, files['chrome.manifest'])
    files['chrome.manifest'] = re.sub(r'(\s)chrome/', r'\1%s/chrome/' % baseURL, files['chrome.manifest'])
    files['chrome.manifest'] = re.sub(r'\b(resource\s+\S+\s+)', r'\1%s/' % baseURL, files['chrome.manifest'])
    files['chrome.manifest'] = re.sub(r'\b(content\s+\S+\s+)(\w+/)', r'\1%s/\2' % baseURL, files['chrome.manifest'])
    if os.path.exists(os.path.join(baseDir, 'mochitest')):
      files['chrome.manifest'] += 'content mochikit %s/mochitest/\n' % baseURL

  id = metadata.get('general', 'id')
  for dir in profileDirs:
    # Remove packed XPI file if there is one
    packedPath = os.path.join(dir, 'extensions', '%s.xpi' % id)
    if os.path.isfile(packedPath):
      os.remove(packedPath)

    # Replace unpacked dir by new data
    unpackedPath = os.path.join(dir, 'extensions', id)
    if os.path.isdir(unpackedPath):
      shutil.rmtree(unpackedPath)
    for file, data in files.iteritems():
      filePath = os.path.join(unpackedPath, *(file.split('/')))
      parentDir = os.path.dirname(filePath)
      if not os.path.exists(parentDir):
        os.makedirs(parentDir)
      handle = open(filePath, 'wb')
      handle.write(data)
      handle.close()
