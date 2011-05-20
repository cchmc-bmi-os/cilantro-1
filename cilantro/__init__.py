VERSION = (2, 1, 3, 'rc', 1)

def get_version():
    version = 'v%s.%s' % VERSION[:2]
    if version[2]:
        version = '%s.%s' % (version, VERSION[2])

    if len(VERSION) > 3:
        if VERSION[3:] == ('alpha', 0):
            version = '%spre-alpha' % version
        else:
            if VERSION[3] != 'final':
                version = '%s%s%s' % (version, VERSION[3], VERSION[4])
    return version
