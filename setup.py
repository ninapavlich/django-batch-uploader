from setuptools import setup, find_packages

setup(
    name = 'django_batch_uploader',
    version = '0.14',
    author = 'Nina Pavlich',
    author_email='nina@ninalp.com',
    url = 'https://github.com/ninapavlich/django-batch-uploader',
    license = "MIT",

    description = 'Batch Uploading Mechanism for Django Admin',
    keywords = ['libraries', 'web development'],

    include_package_data = True,
    packages = ['django_batch_uploader'],
    
    classifiers=[
        'Development Status :: 4 - Beta',
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Natural Language :: English',
        'Operating System :: OS Independent',
        'Programming Language :: Python'
    ]
)